// assets/js/ui.js

// ---------- Loader (page overlay) ----------
function getLoader() {
  return document.getElementById("page-loader");
}
function setLoaderVisible(visible) {
  const loader = getLoader();
  if (!loader) return;
  loader.classList.toggle("active", !!visible);
  loader.setAttribute("aria-hidden", visible ? "false" : "true");
}
export function showLoader() { setLoaderVisible(true); }
export function hideLoader() { setLoaderVisible(false); }

// Integración con el router: mostrar/ocultar loader en cada navegación
document.addEventListener("spa:navigating", () => showLoader());
document.addEventListener("spa:rendered",   () => hideLoader());

// ---------- Toast helpers (inline messages) ----------
export function toastOK(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = "block";
  el.setAttribute("role", "status");
}
export function toastError(el, msg) {
  if (!el) return;
  el.textContent = msg || "";
  el.style.display = "block";
  el.setAttribute("role", "alert");
}
export function clearToast(el) {
  if (!el) return;
  el.textContent = "";
  el.style.display = "";
  el.removeAttribute("role");
}

// ---------- Navbar helpers ----------
export function showNav() {
  const nav = document.getElementById("sub-nav");
  if (!nav) return;
  nav.style.display = "";
  nav.removeAttribute("aria-hidden");
}
export function hideNav() {
  const nav = document.getElementById("sub-nav");
  if (!nav) return;
  nav.style.display = "none";
  nav.setAttribute("aria-hidden", "true");
}
