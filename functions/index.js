// functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";

/**
 * Define el secreto en Secret Manager:
 *   firebase functions:secrets:set RECAPTCHA_SECRET
 * (para local también puedes exportar RECAPTCHA_SECRET como variable de entorno)
 */
const RECAPTCHA_SECRET = defineSecret("RECAPTCHA_SECRET");

// Dominios que aceptamos en el hostname reportado por Google (opcional)
const ALLOWED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  // añade tus dominios de hosting:
  "crudcenter-28cf1.web.app",
  "crudcenter-28cf1.firebaseapp.com",
]);

// Umbral típico para reCAPTCHA v3
const SCORE_THRESHOLD = 0.5;

/**
 * Endpoint: /api/verify-recaptcha   (rewrite en firebase.json)
 * Método: POST  { "token": "<grecaptcha token>" }
 */
export const verifyRecaptcha = onRequest(
  {
    region: "us-central1",
    secrets: [RECAPTCHA_SECRET],
    timeoutSeconds: 10,
  },
  async (req, res) => {
    // CORS básico (útil en emulador o si llamas directo)
    const origin = req.headers.origin || "*";
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "method_not_allowed" });
    }

    // Extraer token del body
    let token = null;
    try {
      if (typeof req.body === "string") {
        try {
          const parsed = JSON.parse(req.body);
          token = parsed?.token || parsed?.response || null;
        } catch {
          token = null;
        }
      } else if (req.body && typeof req.body === "object") {
        token = req.body.token || req.body.response || null;
      }
    } catch {
      token = null;
    }

    if (!token) {
      return res.status(400).json({ ok: false, error: "missing_token" });
    }

    // Secret desde Secret Manager o env (fallback para local)
    const secret =
      RECAPTCHA_SECRET.value() || process.env.RECAPTCHA_SECRET || "";

    if (!secret) {
      logger.error("RECAPTCHA_SECRET no configurado");
      return res.status(500).json({ ok: false, error: "server_misconfigured" });
    }

    try {
      // Construir petición a Google
      const params = new URLSearchParams();
      params.append("secret", secret);
      params.append("response", token);

      // X-Forwarded-For -> remoteip (opcional)
      const forwardedFor = (req.headers["x-forwarded-for"] || "")
        .toString()
        .split(",")[0]
        .trim();
      if (forwardedFor) params.append("remoteip", forwardedFor);

      const googleResp = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString(),
        }
      );

      const data = await googleResp.json();

      const success = !!data.success;
      const score = typeof data.score === "number" ? data.score : null;
      const action = data.action || null;
      const hostname = data.hostname || null;
      const errorCodes = data["error-codes"] || [];

      // Validaciones adicionales (score/hostname)
      const scoreOK = score === null ? true : score >= SCORE_THRESHOLD;
      const hostOK =
        !hostname || ALLOWED_HOSTNAMES.size === 0
          ? true
          : ALLOWED_HOSTNAMES.has(hostname);

      const ok = success && scoreOK && hostOK;

      logger.info("reCAPTCHA verify", { ok, score, action, hostname, errorCodes });

      return res.status(ok ? 200 : 403).json({
        ok,
        score,
        action,
        hostname,
        errorCodes,
      });
    } catch (err) {
      logger.error("reCAPTCHA verify error", err);
      return res.status(500).json({ ok: false, error: "verification_failed" });
    }
  }
);
