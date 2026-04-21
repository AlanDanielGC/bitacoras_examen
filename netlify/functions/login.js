const bcrypt = require("bcryptjs");
const pool = require("./_db");
const { createToken } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { email, password } = JSON.parse(event.body);

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role
       FROM users
       WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      await pool.query(
        `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
         VALUES ($1, 'login_failed', $2, $3, $4)`,
        [null, `Intento de acceso fallido con email: ${email}`, event.headers["x-nf-client-connection-ip"] || null, event.headers["user-agent"] || null]
      );

      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: "Credenciales inválidas." })
      };
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      await pool.query(
        `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
         VALUES ($1, 'login_failed', $2, $3, $4)`,
        [user.id, `Contraseña incorrecta para: ${email}`, event.headers["x-nf-client-connection-ip"] || null, event.headers["user-agent"] || null]
      );

      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: "Credenciales inválidas." })
      };
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
      [
        user.id,
        `Acceso correcto de ${user.email}`,
        event.headers["x-nf-client-connection-ip"] || null,
        event.headers["user-agent"] || null
      ]
    );

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": `session=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
      },
      body: JSON.stringify({
        success: true,
        message: "Inicio de sesión correcto.",
        role: user.role
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error en el login.",
        error: error.message
      })
    };
  }
};