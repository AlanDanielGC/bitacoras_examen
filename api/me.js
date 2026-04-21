const pool = require("./_db");
const { verifyToken } = require("./_auth");
const { getCookieValue, sendJson } = require("./_http");

module.exports = async (req, res) => {
  try {
    const token = getCookieValue(req, "session");

    if (!token) {
      sendJson(res, 401, {
        success: false,
        message: "No autenticado."
      });
      return;
    }

    const decoded = verifyToken(token);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role
       FROM sessions s
       INNER JOIN users u ON u.id = s.user_id
       WHERE s.session_token = $1
         AND s.expires_at > NOW()
         AND u.id = $2`,
      [token, decoded.id]
    );

    if (!result.rows.length) {
      sendJson(res, 401, {
        success: false,
        message: "Sesión inválida o expirada."
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    sendJson(res, 401, {
      success: false,
      message: "Sesión inválida o expirada."
    });
  }
};