document.addEventListener("DOMContentLoaded", () => {
  const apiBase = "/api";
  const storageKey = "bitacoras_records";
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const message = document.getElementById("message");

  const roleLabels = {
    admin: "Administrador",
    user: "Usuario"
  };

  function readStoredRecords() {
    try {
      const storedRecords = window.localStorage.getItem(storageKey);
      return storedRecords ? JSON.parse(storedRecords) : [];
    } catch (error) {
      return [];
    }
  }

  function writeStoredRecords(records) {
    window.localStorage.setItem(storageKey, JSON.stringify(records));
  }

  function addRecord(text) {
    const cleanText = text.trim();
    const records = readStoredRecords();

    if (!cleanText) {
      return { records, added: false };
    }

    records.unshift({
      id: Date.now(),
      text: cleanText,
      createdAt: new Date().toLocaleString("es-ES")
    });

    writeStoredRecords(records);

    return { records, added: true };
  }

  function removeRecord(recordId) {
    const records = readStoredRecords().filter((record) => record.id !== recordId);
    writeStoredRecords(records);
    return records;
  }

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

  function renderDashboard(user) {
    const expectedRole = window.location.pathname.includes("admin") ? "admin" : "user";

    if (expectedRole && expectedRole !== user.role) {
      window.location.href = user.role === "admin" ? "/admin.html" : "/user.html";
      return;
    }

    const isAdmin = user.role === "admin";
    const roleLabel = roleLabels[user.role] || "Invitado";

    document.body.className = "dashboard-page";
    document.body.innerHTML = `
      <div class="shell">
        <header class="hero-card">
          <div>
            <p class="eyebrow">Plataforma de acceso</p>
            <h1 id="welcome">Bienvenido, ${user.name}</h1>
            <p id="profileNote" class="hero-copy"></p>
          </div>
          <div class="hero-meta">
            <span id="profileBadge" class="profile-badge">Perfil actual: ${roleLabel}</span>
            <button id="logoutBtn" class="btn btn-secondary" type="button">Cerrar sesión</button>
          </div>
        </header>

        <section class="permission-summary">
          <article class="summary-card">
            <h2>Perfil</h2>
            <p>${roleLabel}</p>
          </article>
          <article class="summary-card">
            <h2>Permiso</h2>
            <p>${isAdmin ? "Acceso completo" : "Solo visualización"}</p>
          </article>
          <article class="summary-card">
            <h2>Estado</h2>
            <p>${isAdmin ? "Puede insertar y eliminar registros" : "No puede modificar registros"}</p>
          </article>
        </section>

        <main id="permissionsGrid" class="permissions-grid" data-role="${user.role}">
          <section class="panel" data-permission="insert">
            <h2>Insertar información</h2>
            <p>Agrega un registro nuevo al panel.</p>
            <form id="insertForm" class="panel-form">
              <input id="recordInput" type="text" placeholder="Escribe información para insertar" ${isAdmin ? "" : "disabled"} />
              <button type="submit" class="btn" ${isAdmin ? "" : "disabled"}>Agregar registro</button>
            </form>
            <p id="insertMessage" class="panel-note"></p>
          </section>

          <section class="panel" data-permission="delete">
            <h2>Eliminar</h2>
            <p>Quita registros existentes según tu perfil.</p>
            <ul id="deleteList" class="record-list"></ul>
          </section>

          <section class="panel" data-permission="view">
            <h2>Solo visualizar</h2>
            <p>Consulta el contenido disponible sin modificarlo.</p>
            <div id="recordsView" class="records-view"></div>
          </section>
        </main>
      </div>
    `;

    const profileNote = document.getElementById("profileNote");
    const insertForm = document.getElementById("insertForm");
    const recordInput = document.getElementById("recordInput");
    const insertMessage = document.getElementById("insertMessage");
    const recordsView = document.getElementById("recordsView");
    const deleteList = document.getElementById("deleteList");
    const logoutBtn = document.getElementById("logoutBtn");
    const permissionSections = document.querySelectorAll("[data-permission]");

    if (profileNote) {
      profileNote.textContent = isAdmin
        ? "Tienes permisos para insertar, eliminar y visualizar información."
        : "Tu perfil solo permite visualizar la información disponible.";
    }

    permissionSections.forEach((section) => {
      const permission = section.dataset.permission;
      const allowed = permission === "view" || isAdmin;

      section.classList.toggle("permission-disabled", !allowed);
      section.setAttribute("aria-disabled", String(!allowed));
    });

    function renderRecords() {
      const records = readStoredRecords();

      if (recordsView) {
        recordsView.innerHTML = records.length
          ? records
              .map(
                (record) => `
                  <article class="record-item">
                    <strong>${record.text}</strong>
                    <span>${record.createdAt}</span>
                  </article>
                `
              )
              .join("")
          : '<p class="empty-state">Todavía no hay registros guardados.</p>';
      }

      if (deleteList) {
        deleteList.innerHTML = records.length
          ? records
              .map(
                (record) => `
                  <li>
                    <div>
                      <strong>${record.text}</strong>
                      <small>${record.createdAt}</small>
                    </div>
                    ${isAdmin ? `<button class="btn btn-secondary delete-btn" type="button" data-record-id="${record.id}">Eliminar</button>` : ""}
                  </li>
                `
              )
              .join("")
          : '<li class="empty-state">No hay elementos para eliminar.</li>';
      }
    }

    if (insertForm && recordInput && insertMessage) {
      insertForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!isAdmin) {
          insertMessage.textContent = "Tu perfil no tiene permiso para insertar información.";
          return;
        }

        const result = addRecord(recordInput.value);

        if (!result.added) {
          insertMessage.textContent = "Escribe un texto válido para agregar un registro.";
          return;
        }

        recordInput.value = "";
        insertMessage.textContent = "Registro agregado correctamente.";
        renderRecords();
      });
    }

    if (deleteList) {
      deleteList.addEventListener("click", (event) => {
        const target = event.target;

        if (!(target instanceof HTMLButtonElement)) {
          return;
        }

        if (!isAdmin) {
          return;
        }

        const recordId = Number(target.dataset.recordId);

        if (!recordId) {
          return;
        }

        removeRecord(recordId);
        renderRecords();
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

    renderRecords();
  }

  async function initDashboard() {
    try {
      const res = await fetch(`${apiBase}/me`);
      const data = await res.json();

      if (!data.success || !data.user) {
        window.location.href = "/login.html";
        return;
      }

      renderDashboard(data.user);
    } catch (error) {
      window.location.href = "/login.html";
    }
  }

  if (window.location.pathname.endsWith("user.html") || window.location.pathname.endsWith("admin.html")) {
    initDashboard();
    return;
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

        if (message) {
          message.textContent = response.message;
        }
      } catch (error) {
        if (message) {
          message.textContent = `Error al registrar usuario: ${error.message}`;
        }
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

        if (message) {
          message.textContent = response.message;
        }

        if (result.success) {
          window.location.href = result.role === "admin" ? "/admin.html" : "/user.html";
        }
      } catch (error) {
        if (message) {
          message.textContent = "Error de red al iniciar sesión.";
        }
      }
    });
  }
});