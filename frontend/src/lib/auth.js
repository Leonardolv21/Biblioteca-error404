// URL base del backend Express
const API_BASE = "http://localhost:3000/api";

export const SESSION_KEY = "biblioteca_session";

// Mapeo de rol del backend → ruta de dashboard en frontend
const DASHBOARD_MAP = {
  administrador: "/admin/dashboard",
  bibliotecario: "/bibliotecario/dashboard",
  estudiante: "/estudiante/dashboard",
};

/**
 * Login real contra el backend.
 * Envía correo + password a POST /api/auth/login
 * y guarda token + datos del usuario en sessionStorage.
 */
export async function login(correo, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        message: data.error || "Credenciales inválidas.",
      };
    }

    const session = {
      id: data.user.id,
      name: `${data.user.nombre} ${data.user.apellido}`,
      role: data.user.rol,           // "administrador" | "bibliotecario" | "estudiante"
      dashboard: DASHBOARD_MAP[data.user.rol] || "/",
      token: data.token,
      correo: data.user.correo,
      matricula: data.user.matricula,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { ok: true, user: session };
  } catch (err) {
    return {
      ok: false,
      message: "No se pudo conectar con el servidor.",
    };
  }
}

/**
 * Obtiene la sesión actual desde sessionStorage.
 */
export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Devuelve el token JWT para usar en headers Authorization.
 */
export function getToken() {
  const session = getSession();
  return session?.token || null;
}

/**
 * Helper para hacer fetch autenticado al backend.
 * Adjunta automáticamente el Bearer token.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  return res;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return !!getSession();
}