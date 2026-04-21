const bcrypt = require("bcryptjs");
const pool = require("./_db");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { name, email, password, role } = JSON.parse(event.body);

    if (!name || !email || !password || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Faltan campos obligatorios." })
      };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );

    const user = userResult.rows[0];

    await pool.query(
      `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
       VALUES ($1, 'login_failed', $2, $3, $4)`,
      [null, `Usuario registrado: ${email}`, event.headers["x-nf-client-connection-ip"] || null, event.headers["user-agent"] || null]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Usuario registrado correctamente.",
        user
      })
    };
  } catch (error) {
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