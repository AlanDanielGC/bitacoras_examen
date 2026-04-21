const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./_db");
const { getClientIp, getJsonBody, sendJson } = require("./_http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, error: "Método no permitido" });
    return;
  }

  try {
    const body = await getJsonBody(req);
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      sendJson(res, 400, {
        success: false,
        error: "Faltan campos obligatorios"
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const clientIp = getClientIp(req);
    const userAgent = req.headers["user-agent"] || null;

    const userResult = await pool.query(
      `INSERT INTO public.users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, role]
    );

    const user = userResult.rows[0];

    await pool.query(
      `INSERT INTO public.logs (user_id, event_type, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        "register",
        `Nuevo usuario registrado: ${email} (${role})`,
        clientIp,
        userAgent
      ]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    sendJson(res, 200, {
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "23505") {
      sendJson(res, 409, {
        success: false,
        error: "Ese correo ya está registrado."
      });
      return;
    }

    const statusCode = error.message === "Invalid JSON body" ? 400 : 500;

    sendJson(res, statusCode, {
      success: false,
      error: error.message
    });
  }
};