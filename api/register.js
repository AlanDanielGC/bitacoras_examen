const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./_db");
const { getJsonBody, sendJson } = require("./_http");

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

    const userResult = await pool.query(
      `INSERT INTO public.users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, role]
    );

    const user = userResult.rows[0];

    await pool.query(
      `INSERT INTO public.logs (user_id, event_type, details)
       VALUES ($1, $2, $3)`,
      [
        user.id,
        "register",
        JSON.stringify({
          name,
          email,
          role
        })
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

    const statusCode = error.message === "Invalid JSON body" ? 400 : 500;

    sendJson(res, statusCode, {
      success: false,
      error: error.message
    });
  }
};