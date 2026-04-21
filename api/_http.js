function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  for (const [headerName, headerValue] of Object.entries(extraHeaders)) {
    res.setHeader(headerName, headerValue);
  }

  res.end(JSON.stringify(payload));
}

function getJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1e6) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];

  if (typeof realIp === "string" && realIp.length > 0) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || null;
}

function buildSessionCookie(token, maxAgeSeconds) {
  const parts = [
    `session=${token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax"
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearSessionCookie() {
  const parts = [
    "session=",
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax"
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]+)`));

  return match ? match[1] : null;
}

module.exports = {
  buildSessionCookie,
  clearSessionCookie,
  getClientIp,
  getCookieValue,
  getJsonBody,
  sendJson
};