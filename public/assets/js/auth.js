// public/assets/js/auth.js

import {
  // Auth / Firestore (re-exportados desde tu firebase-config.js)
  auth, db,
  onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail, // << asegúrate de re-exportar esto en firebase-config.js
  signOut, updateProfile,
  doc, setDoc, serverTimestamp
} from "./firebase-config.js";

import { navigate } from "./router.js";
import { showLoader, hideLoader, toastError, toastOK } from "./ui.js";

// Password policy: 8+ with upper, lower, digit
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const FX_DURATION_MS = 800;

function q(id){ return document.getElementById(id); }

function mapAuthError(err){
  const c = err?.code || "";
  if (c.includes("auth/invalid-credential")) return "Credenciales inválidas";
  if (c.includes("auth/email-already-in-use")) return "El email ya está registrado";
  if (c.includes("auth/invalid-email")) return "Email inválido";
  if (c.includes("auth/weak-password")) return "Contraseña débil";
  if (c.includes("auth/popup-closed-by-user")) return "Ventana cerrada";
  if (c.includes("auth/too-many-requests")) return "Demasiados intentos. Intenta más tarde";
  if (c.includes("auth/network-request-failed")) return "Sin conexión. Revisa tu red";
  if (c.includes("auth/user-not-found")) return "No existe una cuenta con ese email";
  if (c.includes("auth/missing-email")) return "Ingresa tu email";
  return "Ocurrió un error";
}

/**
 * Upsert del perfil en Firestore.
 * - En registro: incluye createdAt y lastLogin.
 * - En login (email/Google): actualiza lastLogin y sincroniza displayName/email sin tocar createdAt.
 */
async function upsertUserProfile(user, { includeCreatedAt = false } = {}){
  if (!user) return;
  const payload = {
    displayName: user.displayName || (user.email?.split("@")[0]) || "Estudiante",
    email: user.email || "",
    lastLogin: serverTimestamp()
  };
  if (includeCreatedAt) payload.createdAt = serverTimestamp();
  // merge:true evita sobreescribir el documento completo
  await setDoc(doc(db, "users", user.uid), payload, { merge: true });
}

export function attachLoginHandlers(){
  const card = q("auth-card");

  const form = q("auth-form");
  const email = q("email");
  const password = q("password");
  const confirmPwd = q("confirm");
  const firstName = q("firstName");
  const lastName = q("lastName");
  const nameRow = q("name-row");
  const confirmRow = q("confirm-row");
  const toggle = q("toggle-link");
  const toggleText = q("toggle-text");
  const formTitle = q("form-title");
  const primaryBtn = q("primary-btn");
  const googleBtn = q("google-btn");
  const rememberMe = q("rememberMe");
  const errBox = q("auth-error");
  const okBox = q("auth-ok");
  const togglePass = q("toggle-pass");
  const togglePassConfirm = q("toggle-pass-confirm");
  const forgotLink = q("forgot-link"); // <a id="forgot-link">¿Olvidaste tu contraseña?</a>

  let mode = "login"; // 'login' | 'register'
  let fxTimer = null;

  // Utilidades
  const setBusy = (busy) => {
    if (primaryBtn) primaryBtn.disabled = busy;
    if (googleBtn) googleBtn.disabled = busy;
    if (form) form.querySelectorAll("input,button,select,textarea").forEach(el => {
      const isToggle = (el === toggle || el === togglePass || el === togglePassConfirm || el === forgotLink);
      el.disabled = busy && !isToggle;
    });
  };

  const clearFeedback = () => {
    if (errBox) errBox.textContent = "";
    if (okBox) okBox.textContent = "";
  };

  function pulseFx(cls){
    if (!card) return;
    card.classList.remove("fx-reg", "fx-log");
    if (fxTimer) clearTimeout(fxTimer);
    // reflow
    // eslint-disable-next-line no-unused-expressions
    card.offsetWidth;
    card.classList.add(cls);
    fxTimer = setTimeout(()=> card.classList.remove(cls), FX_DURATION_MS + 50);
  }

  function setMode(m){
    mode = m;
    clearFeedback();

    const isLogin = (m === "login");

    if (nameRow) nameRow.style.display = isLogin ? "none" : "flex";
    if (confirmRow) confirmRow.style.display = isLogin ? "none" : "block";

    if (!isLogin && confirmPwd) confirmPwd.value = "";

    if (formTitle)  formTitle.textContent  = isLogin ? "Iniciar sesión" : "Crear cuenta";
    if (toggleText) toggleText.textContent = isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
    if (toggle) {
      toggle.textContent = isLogin ? "Regístrate" : "Entrar";
      toggle.setAttribute("aria-expanded", (!isLogin).toString());
    }
    if (primaryBtn) primaryBtn.textContent = isLogin ? "Iniciar sesión" : "Registrarme";

    if (password) password.autocomplete = isLogin ? "current-password" : "new-password";

    if (card) {
      card.classList.toggle("register-mode", !isLogin);
      card.dataset.mode = m;
    }
  }
  setMode("login");

  if (card){
    card.addEventListener("animationend", () => {
      card.classList.remove("fx-reg", "fx-log");
    });
  }

  if (toggle) {
    toggle.addEventListener("click", (e)=>{
      e.preventDefault();
      const nextMode = (mode === "login") ? "register" : "login";
      pulseFx(nextMode === "register" ? "fx-reg" : "fx-log");
      setMode(nextMode);
    });
  }

  if (togglePass && password){
    togglePass.addEventListener("click", ()=>{
      const isPwd = password.type === "password";
      password.type = isPwd ? "text" : "password";
      togglePass.textContent = isPwd ? "Ocultar" : "Mostrar";
      togglePass.setAttribute("aria-pressed", (!isPwd).toString());
    });
  }

  if (togglePassConfirm && confirmPwd){
    togglePassConfirm.addEventListener("click", ()=>{
      const isPwd = confirmPwd.type === "password";
      confirmPwd.type = isPwd ? "text" : "password";
      togglePassConfirm.textContent = isPwd ? "Ocultar" : "Mostrar";
      togglePassConfirm.setAttribute("aria-pressed", (!isPwd).toString());
    });
  }

  // Recordarme -> persistence
  if (rememberMe){
    const applyPersistence = async () => {
      try{
        await setPersistence(auth, rememberMe.checked ? browserLocalPersistence : browserSessionPersistence);
      }catch(e){
        console.warn("Persistence error:", e);
      }
    };
    rememberMe.addEventListener("change", applyPersistence);
    applyPersistence();
  }

  // Submit (login/registro)
  if (form){
    form.addEventListener("submit", async (e)=>{
      e.preventDefault();
      clearFeedback();

      const mail = (email?.value||"").trim();
      const pwd = password?.value || "";

      if (!mail){ toastError(errBox, "Ingresa tu email"); return; }
      if (!pwd){ toastError(errBox, "Ingresa tu contraseña"); return; }

      if (mode === "register"){
        const fn = (firstName?.value||"").trim();
        const ln = (lastName?.value||"").trim();
        const cp = confirmPwd?.value || "";

        if (!fn || !ln){ toastError(errBox, "Ingresa nombre y apellido"); return; }
        if (!PWD_REGEX.test(pwd)){ toastError(errBox, "La contraseña no cumple la política (8+ con mayúscula, minúscula y dígito)"); return; }
        if (pwd !== cp){ toastError(errBox, "La confirmación no coincide"); return; }

        try{
          setBusy(true); showLoader();
          const cred = await createUserWithEmailAndPassword(auth, mail, pwd);
          const displayName = `${fn} ${ln}`.trim();
          await updateProfile(cred.user, { displayName });

          // Perfil: createdAt + lastLogin
          await upsertUserProfile(
            { ...cred.user, displayName, email: mail },
            { includeCreatedAt: true }
          );

          toastOK(okBox, "Cuenta creada. Redirigiendo…");
          navigate("#/dashboard");
        }catch(err){
          toastError(errBox, mapAuthError(err));
        }finally{ hideLoader(); setBusy(false); }

      } else {
        // LOGIN
        try{
          setBusy(true); showLoader();
          const { user } = await signInWithEmailAndPassword(auth, mail, pwd);

          // Actualiza perfil (NO toca createdAt)
          await upsertUserProfile(user, { includeCreatedAt: false });

          toastOK(okBox, "Inicio de sesión exitoso");
          navigate("#/dashboard");
        }catch(err){
          toastError(errBox, mapAuthError(err));
        }finally{ hideLoader(); setBusy(false); }
      }
    });
  }

  // Google Sign-In
  if (googleBtn){
    googleBtn.addEventListener("click", async ()=>{
      clearFeedback();
      try{
        setBusy(true); showLoader();
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        // Sin tocar createdAt para no sobrescribirlo
        await upsertUserProfile(result.user, { includeCreatedAt: false });

        navigate("#/dashboard");
      }catch(err){
        toastError(errBox, mapAuthError(err));
      }finally{ hideLoader(); setBusy(false); }
    });
  }

  // Forgot password (usa el email del input)
  if (forgotLink){
    forgotLink.addEventListener("click", async (e)=>{
      e.preventDefault();
      clearFeedback();
      const mail = (email?.value||"").trim();
      if (!mail){
        toastError(errBox, "Ingresa tu email para enviarte el enlace de restablecimiento");
        email?.focus();
        return;
      }
      try{
        setBusy(true); showLoader();
        await sendPasswordResetEmail(auth, mail);
        toastOK(okBox, "Te enviamos un enlace para restablecer tu contraseña");
      }catch(err){
        toastError(errBox, mapAuthError(err));
      }finally{ hideLoader(); setBusy(false); }
    });
  }

  // Limpieza opcional
  const listeners = [];
  const addL = (el, ev, fn) => { if (el){ el.addEventListener(ev, fn); listeners.push(()=> el.removeEventListener(ev, fn)); } };
  return () => listeners.forEach(off => off());
}

export function attachDashboardHandlers(){
  const nameEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");

  onAuthStateChanged(auth, user=>{
    if (!user){ navigate("#/login"); return; }
    if (nameEl) nameEl.textContent = user.displayName || (user.email?.split("@")[0]) || "Estudiante";
  });

  if (logoutBtn){
    logoutBtn.addEventListener("click", async ()=>{
      await signOut(auth);
      navigate("#/login");
    });
  }
}
