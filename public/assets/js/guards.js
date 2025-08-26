// assets/js/guards.js
import { auth, onAuthStateChanged } from "./firebase-config.js";
import { navigate } from "./router.js";
import { showNav, hideNav } from "./ui.js";

/** Rutas que requieren usuario autenticado */
const protectedRoutes = new Set([
  "/dashboard",
  "/tareas",
  "/calendario",
  "/notas",
  "/archivos",
  "/pizarra",
  "/perfil",
]);

/** Obtiene el usuario una sola vez (resuelve en el primer cambio de estado) */
function getAuthUserOnce() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}

/** Muestra/oculta nav global (soporta #sub-nav y #main-nav como legado) */
function setNavVisible(isVisible) {
  // Usa helpers del UI para #sub-nav
  if (isVisible) showNav(); else hideNav();

  // Compatibilidad con ID legado
  const legacy = document.getElementById("main-nav");
  if (legacy) legacy.style.display = isVisible ? "flex" : "none";
}

/**
 * Guard de ruta: retorna true si puede renderizarse.
 * - Oculta nav en /login, lo muestra en rutas públicas si ya hay sesión.
 * - En rutas protegidas, redirige a /login si no hay usuario.
 */
export async function guardRoute(path) {
  // /login siempre pública y oculta el navbar
  if (path === "/login") {
    setNavVisible(false);
    return true;
  }

  // Rutas públicas: muestra nav solo si ya hay usuario
  if (!protectedRoutes.has(path)) {
    getAuthUserOnce().then((u) => setNavVisible(!!u));
    return true;
  }

  // Rutas protegidas: exige usuario
  const user = await getAuthUserOnce();
  if (!user) {
    setNavVisible(false);
    navigate("#/login");
    return false;
  }

  setNavVisible(true);
  return true;
}

/**
 * Evita mostrar el login si ya hay sesión. También asegura el navbar visible.
 */
export async function guardLogin(path) {
  if (path !== "/login") return;
  const user = await getAuthUserOnce();
  if (user) {
    setNavVisible(true);
    navigate("#/dashboard");
  } else {
    setNavVisible(false);
  }
}

/**
 * Inicializa los guards enganchándose a los eventos del SPA.
 * (Útil si no quieres llamar a guardRoute/guardLogin desde main.js)
 */
export function initGuards() {
  // Antes de renderizar, decidir si la ruta está permitida
  document.addEventListener("spa:navigating", async (e) => {
    const path = e.detail?.path || "/login";
    const allowed = await guardRoute(path);
    // Si no está permitido, navigate() se encargará de redirigir.
    // El router quizá ya haya iniciado el fetch, pero la segunda navegación
    // sobrescribirá el contenido inmediatamente.
  });

  // Al navegar a /login con sesión, saltar a dashboard
  document.addEventListener("spa:rendered", async (e) => {
    const path = e.detail?.path || "/login";
    await guardLogin(path);
  });
}

// Auto-init opcional: descomenta si quieres que se autoenganche al import
// initGuards();
