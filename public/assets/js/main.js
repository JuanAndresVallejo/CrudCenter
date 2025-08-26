// assets/js/main.js
import { startRouter } from "./router.js";
import { attachLoginHandlers, attachDashboardHandlers } from "./auth.js";
import { guardRoute, guardLogin } from "./guards.js";
import { showLoader, hideLoader } from "./ui.js";
import { attachTasksHandlers } from "./tasks.js";
import { attachCalendarHandlers } from "./calendar.js";

// Mapa de alias ES -> EN para compatibilidad temporal
const ALIASES = new Map([
  ["/tareas", "/tasks"],
  ["/calendario", "/calendar"],
  ["/notas", "/notes"],
  ["/archivos", "/files"],
  ["/pizarra", "/whiteboard"],
  ["/perfil", "/profile"],
]);
const canon = (p) => ALIASES.get(p) || p;

// Guarda el cleanup de la vista actual (si lo hay)
let lastCleanup = null;

// Delegación de clicks del navbar (para mostrar loader al navegar)
let navDelegated = false;
function ensureNavDelegation() {
  const nav = document.getElementById("sub-nav");
  if (nav && !navDelegated) {
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a.nav-link");
      if (a) showLoader();
    });
    navDelegated = true;
  }
}

/* ========== Resalta el link activo del navbar (y navs fallback en vistas) ========== */
function setActiveNav(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path.replace(/^#?\//, "")}`;
  const currentCanon = canon(cleanPath);

  const navs = [
    document.getElementById("sub-nav"),
    // fallback navs que algunas vistas incluyen para abrirlas directo en el navegador
    ...document.querySelectorAll("[data-standalone-nav]"),
  ].filter(Boolean);

  navs.forEach((nav) => {
    nav.querySelectorAll("a.nav-link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const route = href.replace(/^#/, "");
      const routeCanon = canon(route);
      a.classList.toggle("active", route === cleanPath || routeCanon === currentCanon);
    });
  });
}

/* ========== Adjuntar handlers por vista ========== */
function attachHandlersForPath(path) {
  if (lastCleanup) {
    try { lastCleanup(); } catch { /* noop */ }
    lastCleanup = null;
  }

  const p = canon(path);
  switch (p) {
    case "/login":
      lastCleanup = attachLoginHandlers() || null;
      break;
    case "/dashboard":
      lastCleanup = attachDashboardHandlers() || null;
      break;
    case "/tasks": // compat con /tareas mediante canon()
      lastCleanup = attachTasksHandlers() || null;
      break;
    case "/calendar": // compat con /calendario mediante canon()
      lastCleanup = attachCalendarHandlers() || null;
      break;

    // Otras vistas aún no requieren handlers
    case "/notes":
    case "/files":
    case "/whiteboard":
    case "/profile":
    default:
      lastCleanup = null;
      break;
  }
}

/* ========== Utilidad local para obtener la ruta ========== */
function getPathFromHash() {
  const h = location.hash || "#/login";
  const m = h.match(/^#(\/[a-zA-Z0-9_-]+)(\/.*)?$/);
  return m ? m[1] : "/login";
}

/* ========== Eventos del SPA ========== */
document.addEventListener("spa:navigating", (e) => {
  const path = e.detail?.path || getPathFromHash();
  showLoader();
  // guardRoute puede redirigir si no hay sesión
  guardRoute(path).catch(console.error);
});

document.addEventListener("spa:rendered", (e) => {
  const path = e.detail?.path || getPathFromHash();

  // Si hay sesión y estamos en /login, saltar a /dashboard
  guardLogin(path).catch(console.error);

  // Resaltar nav + enganchar handlers de la vista
  setActiveNav(path);
  attachHandlersForPath(path);

  // Asegura una sola vez la delegación de clicks del navbar
  ensureNavDelegation();

  hideLoader();
});

/* ========== Arranque ========== */
ensureNavDelegation();
startRouter();
// Estado inicial por si el router tarda en despachar el primer evento
setActiveNav(getPathFromHash());
