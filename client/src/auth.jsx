import { createContext, useContext, useState } from "react";
import * as api from "./api";

// "Context" lets us share the logged-in state with ANY component without
// passing props down through every level. Think of it as app-wide memory.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Read any saved login from localStorage so a page refresh keeps you
  // logged in. localStorage survives refreshes (unlike React state alone).
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [email, setEmail] = useState(() => localStorage.getItem("email"));
  const [companyName, setCompanyName] = useState(() =>
    localStorage.getItem("companyName")
  );
  // "recruiter" or "candidate" — decides which side of the app you see.
  // NOTE: this localStorage copy is for UI only (which nav to render); the
  // SERVER trusts the role inside the signed token, never this value.
  const [role, setRole] = useState(() => localStorage.getItem("role"));

  // Save a successful login both to localStorage (persists) and state (re-renders).
  function save({ token, email, companyName, role }) {
    localStorage.setItem("token", token);
    localStorage.setItem("email", email);
    localStorage.setItem("companyName", companyName || "");
    localStorage.setItem("role", role || "recruiter");
    setToken(token);
    setEmail(email);
    setCompanyName(companyName || "");
    setRole(role || "recruiter");
  }

  async function login(email, password) {
    save(await api.login(email, password));
  }

  async function register(email, password, companyName, role) {
    save(await api.register(email, password, companyName, role));
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("companyName");
    localStorage.removeItem("role");
    setToken(null);
    setEmail(null);
    setCompanyName(null);
    setRole(null);
  }

  // Delete the logged-in account on the server, then clear the local session
  // (same effect as logout). Returns the server's summary so the UI can show
  // what was removed. We log out only AFTER the server confirms success.
  async function deleteAccount() {
    const result = await api.deleteAccount();
    logout();
    return result;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        email,
        companyName,
        role,
        login,
        register,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// A tiny helper so components can do: const { token, login } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
