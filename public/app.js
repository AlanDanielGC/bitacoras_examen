document.addEventListener("DOMContentLoaded", async () => {
  const apiBase = "/api";
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const message = document.getElementById("message");
  const welcome = document.getElementById("welcome");

  async function readResponseData(res) {
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json();
      return {
        data,
        message: data.message || data.error || (res.ok ? "Respuesta recibida." : `Error ${res.status}`)
      };
    }

    const text = await res.text();
    return {
      data: {},
      message: text || (res.ok ? "Respuesta recibida." : `Error ${res.status}`)
    };
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value
      };

      try {
        const res = await fetch(`${apiBase}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const response = await readResponseData(res);

        if (message) message.textContent = response.message;

      } catch (error) {
        if (message) message.textContent = `Error al registrar usuario: ${error.message}`;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      };

      try {
        const res = await fetch(`${apiBase}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });

        const response = await readResponseData(res);
        const result = response.data;

        if (message) message.textContent = response.message;

        if (result.success) {
          if (result.role === "admin") {
            window.location.href = "/admin.html";
          } else {
            window.location.href = "/user.html";
          }
        }
      } catch (error) {
        if (message) message.textContent = "Error de red al iniciar sesión.";
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch(`${apiBase}/logout`, { method: "POST" });
      } finally {
        window.location.href = "/login.html";
      }
    });
  }

  if (welcome) {
    try {
      const res = await fetch(`${apiBase}/me`);
      const data = await res.json();

      if (data.success && data.user) {
        welcome.textContent = `Bienvenido, ${data.user.name}`;
      } else {
        window.location.href = "/login.html";
      }
    } catch (error) {
      window.location.href = "/login.html";
    }
  }
});