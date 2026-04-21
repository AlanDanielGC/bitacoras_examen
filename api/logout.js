const pool = require("./_db");
const { verifyToken } = require("./_auth");
const {
  clearSessionCookie,
  getClientIp,
  getCookieValue,
  sendJson
} = require("./_http");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    sendJson(res, 405, { success: false, message: "Method not allowed" });
    return;
  }

  try {
    const token = getCookieValue(req, "session");

    if (token) {
      let decoded = null;

      try {
        decoded = verifyToken(token);
      } catch (error) {
        decoded = null;
      }

      await pool.query(`DELETE FROM sessions WHERE session_token = $1`, [token]);

      if (decoded) {
        await pool.query(
          `INSERT INTO logs (user_id, event_type, description, ip_address, user_agent)
           VALUES ($1, 'logout', $2, $3, $4)`,
          [
            decoded.id,
            `Cierre de sesión de ${decoded.email}`,
            getClientIp(req),
            req.headers["user-agent"] || null
          ]
        );
      }
    }

    sendJson(
      res,
      200,
      {
        success: true,
        message: "Sesión cerrada."
      },
      {
        "Set-Cookie": clearSessionCookie()
      }
    );
  } catch (error) {
    sendJson(res, 500, {
      success: false,
      message: "Error al cerrar sesión.",
      error: error.message
    });
  }
};