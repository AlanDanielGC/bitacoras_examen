const pool = require("./_db");

exports.handler = async (event) => {
  try {
    console.log("register start");

    const body = JSON.parse(event.body || "{}");
    console.log("body ok", {
      name: !!body.name,
      email: !!body.email,
      password: !!body.password,
      role: !!body.role
    });

    console.log("PGHOST =", JSON.stringify(process.env.PGHOST));
    console.log("PGPORT =", JSON.stringify(process.env.PGPORT));
    console.log("PGDATABASE =", JSON.stringify(process.env.PGDATABASE));
    console.log("PGUSER =", JSON.stringify(process.env.PGUSER));

    const test = await pool.query("SELECT NOW()");
    console.log("db ok:", test.rows[0]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};