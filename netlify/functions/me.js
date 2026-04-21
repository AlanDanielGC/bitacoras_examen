const pool = require("./_db");
const { verifyToken } = require("./_auth");

exports.handler = async (event) => {
  try {
    const cookieHeader = event.headers.cookie || "";
    const match = cookieHeader.match(/session=([^;]+)/);

    if (!match) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: "No autenticado."
        })
      };
    }

    const token = match[1];
    const decoded = verifyToken(token);

    const result = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "Usuario no encontrado."
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: result.rows[0]
      })
    };
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: "Sesión inválida o expirada."
      })
    };
  }
};