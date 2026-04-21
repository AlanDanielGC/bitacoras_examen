const pool = require("./_db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: "Método no permitido" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { name, email, password, role } = body;

    if (!name || !email || !password || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Faltan campos obligatorios"
        })
      };
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      })
    };
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};