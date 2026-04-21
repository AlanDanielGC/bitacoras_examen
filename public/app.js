document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const message = document.getElementById("message");
  const welcome = document.getElementById("welcome");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
        role: document.getElementById("role").value
      };

      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (message) message.textContent = result.message;
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      };

      const res = await fetch("/.netlify/functions/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (message) message.textContent = result.message;

      if (result.success) {
        if (result.role === "admin") {
          window.location.href = "/admin.html";
        } else {
          window.location.href = "/user.html";
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/.netlify/functions/logout", { method: "POST" });
      window.location.href = "/login.html";
    });
  }

  if (welcome) {
    const res = await fetch("/.netlify/functions/me");
    const data = await res.json();

    if (data.success && data.user) {
      welcome.textContent = `Bienvenido, ${data.user.name}`;
    } else {
      window.location.href = "/login.html";
    }
  }
});