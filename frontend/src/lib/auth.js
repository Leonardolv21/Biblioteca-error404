import { mockUsers } from "../data/mockUsers";

export const SESSION_KEY = "biblioteca_session";

export function mockLogin(uid, password) {
  const cleanUid = uid.trim().toLowerCase();

  const user = mockUsers.find(
    (item) =>
      item.uid.toLowerCase() === cleanUid && item.password === password
  );

  if (!user) {
    return {
      ok: false,
      message: "Credenciales inválidas. Revisa el usuario y la contraseña.",
    };
  }

  const session = {
    id: user.id,
    name: user.name,
    role: user.role,
    dashboard: user.dashboard,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return {
    ok: true,
    user: session,
  };
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn() {
  return !!getSession();
}