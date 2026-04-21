const pool = require("./_db");
const { verifyToken } = require("./_auth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const cookieHeader = event.headers.cookie || "";
    const match = cookieHeader.match(/session=([^;]+)/);

    if (match) {
      const token = match[1];
      const decoded = verifyToken(token);

      await pool.query(
        `DELETE FROM sessions WHERE session_token = $1`,
        [token]
      );

      await pool.query(
        `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
         VALUES ($1, 'logout', $2, $3, $4)`,
        [
          decoded.id,
          `Cierre de sesión de ${decoded.email}`,
          event.headers["x-nf-client-connection-ip"] || null,
          event.headers["user-agent"] || null
        ]
      );
    }

    return {
      statusCode: 200,
      headers: {
        "Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
      },
      body: JSON.stringify({ success: true, message: "Sesión cerrada." })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Error al cerrar sesión.",
        error: error.message
      })
    };
  }
};