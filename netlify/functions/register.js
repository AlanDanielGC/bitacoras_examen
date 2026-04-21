const bcrypt = require("bcryptjs");
const pool = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    console.log("register start");

    const { name, email, password, role } = JSON.parse(event.body || "{}");

    console.log("body ok", { name: !!name, email: !!email, password: !!password, role: !!role });

    if (!name || !email || !password || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Faltan campos obligatorios."
        })
      };
    }

    const test = await pool.query("SELECT NOW()");
    console.log("db test ok", test.rows[0]);

    const passwordHash = await bcrypt.hash(password, 10);
    console.log("hash ok");

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );

    console.log("user insert ok", userResult.rows[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Usuario registrado correctamente.",
        user: userResult.rows[0]
      })
    };
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error al registrar usuario.",
        error: error.message
      })
    };
  }
};