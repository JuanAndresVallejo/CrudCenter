// assets/js/router.js

// Mapa de rutas -> archivos de vista
const ROUTES = {
  "/login":      { view: "./views/login.html",      title: "Iniciar sesión · Center" },
  "/dashboard":  { view: "./views/dashboard.html",  title: "Dashboard · Center" },
  "/tareas":     { view: "./views/tareas.html",     title: "Tareas · Center" },
  "/calendario": { view: "./views/calendario.html", title: "Calendario · Center" },
  "/notas":      { view: "./views/notas.html",      title: "Notas · Center" },
  "/archivos":   { view: "./views/archivos.html",   title: "Archivos · Center" },
  "/pizarra":    { view: "./views/pizarra.html",    title: "Pizarra · Center" },
  "/perfil":     { view: "./views/perfil.html",     title: "Perfil · Center" },
};

// ===== Utilidades =====
function getContainer() {
  // Compatible con index antiguo (#app) y nuevo (#main)
  return document.getElementById("main") || document.getElementById("app");
}

function getPathFromHash() {
  const h = window.location.hash || "#/login";
  // Acepta #/ruta o #/ruta/segmentos (usamos el primer segmento)
  const m = h.match(/^#(\/[A-Za-z0-9_-]+)(?:\/.*)?$/);
  return m ? m[1] : "/login";
}

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

async function fetchView(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar la vista: ${url} (${res.status})`);
  return await res.text();
}

/** Marca activo el link correspondiente en el navbar */
function setActiveNav(path) {
  const nav = document.getElementById("sub-nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll(".nav-link"));
  links.forEach(a => {
    // path del href en formato "#/ruta"
    const href = a.getAttribute("href") || "";
    const m = href.match(/^#(\/[A-Za-z0-9_-]+)/);
    const aPath = m ? m[1] : null;

    if (aPath === path) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    } else {
      a.classList.remove("active");
      a.removeAttribute("aria-current");
    }
  });
}

// ===== Render principal =====
async function render(path) {
  const container = getContainer();
  if (!container) {
    throw new Error('No se encontró el contenedor raíz (#main o #app) en index.html');
  }

  const route = ROUTES[path] || ROUTES["/login"];

  // Avisar que vamos a navegar (útil para mostrar loader)
  dispatch("spa:navigating", { path });

  try {
    const html = await fetchView(route.view);
    container.innerHTML = html;
    document.title = route.title;

    // Accesibilidad + scroll top
    container.setAttribute("tabindex", "-1");
    container.focus({ preventScroll: true });
    // comportamiento estándar: 'auto' o 'smooth'
    window.scrollTo({ top: 0, behavior: "auto" });

    // Marcar activo en la barra de navegación
    setActiveNav(path);

    // Avisar que ya renderizamos (main.js engancha handlers)
    dispatch("spa:rendered", { path });
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <section class="card" style="margin:20px auto;max-width:920px">
        <h2 style="margin:0 0 8px">Error cargando la vista</h2>
        <p class="muted">${route.view} — ${err.message}</p>
      </section>`;
    setActiveNav(path);
    dispatch("spa:rendered", { path, error: true });
  }
}

// ===== API pública =====
export function navigate(path) {
  // Normaliza a formato #/ruta
  const norm = path.startsWith("#") ? path : `#${path}`;
  if (window.location.hash !== norm) {
    window.location.hash = norm;
  } else {
    // Misma ruta -> forzar re-render (útil tras acciones en la vista)
    render(getPathFromHash()).catch(console.error);
  }
}

export function startRouter() {
  // Primer render
  render(getPathFromHash()).catch(console.error);

  // Navegación por hash
  window.addEventListener("hashchange", () => {
    render(getPathFromHash()).catch(console.error);
  });
}
