const bcrypt = require("bcryptjs");
const pool = require("./_db");
const { createToken } = require("./_auth");
const {
  buildSessionCookie,
  getClientIp,
  getJsonBody,
  sendJson
} = require("./_http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Method not allowed" });
    return;
  }

  try {
    const body = await getJsonBody(req);
    const { email, password } = body;

    if (!email || !password) {
      sendJson(res, 400, {
        success: false,
        message: "Faltan credenciales."
      });
      return;
    }

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || null;

    if (!user) {
      await pool.query(
        `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
         VALUES ($1, 'login_failed', $2, $3, $4)`,
        [
          null,
          `Intento de acceso fallido con email: ${email}`,
          clientIp,
          userAgent
        ]
      );

      sendJson(res, 401, {
        success: false,
        message: "Credenciales inválidas."
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      await pool.query(
        `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
         VALUES ($1, 'login_failed', $2, $3, $4)`,
        [user.id, `Contraseña incorrecta para: ${email}`, clientIp, userAgent]
      );

      sendJson(res, 401, {
        success: false,
        message: "Credenciales inválidas."
      });
      return;
    }

    const token = createToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    await pool.query(
      `INSERT INTO sessions (user_id, session_token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, token]
    );

    await pool.query(
      `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
       VALUES ($1, 'login_success', $2, $3, $4)`,
      [user.id, `Acceso correcto de ${user.email}`, clientIp, userAgent]
    );

    sendJson(
      res,
      200,
      {
        success: true,
        message: "Inicio de sesión correcto.",
        role: user.role
      },
      {
        "Set-Cookie": buildSessionCookie(token, 604800)
      }
    );
  } catch (error) {
    const statusCode = error.message === "Invalid JSON body" ? 400 : 500;

    sendJson(res, statusCode, {
      success: false,
      message: statusCode === 400 ? "JSON inválido." : "Error en el login.",
      error: error.message
    });
  }
};