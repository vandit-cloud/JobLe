import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchCurrentUser, loginCandidate, loginRecruiter, registerCandidate, registerRecruiter } from "../api/recruiter";
import type { AuthUser } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: { email: string; password: string; role: "recruiter" | "candidate" }) => Promise<void>;
  register: (
    payload:
      | {
          role: "recruiter";
          name: string;
          email: string;
          password: string;
          phone?: string;
          position?: string;
          companyName: string;
          companyIndustry: string;
          companyWebsite?: string;
        }
      | {
          role: "candidate";
          name: string;
          email: string;
          password: string;
          phone?: string;
          professionalTitle?: string;
          location?: string;
        },
  ) => Promise<void>;
  logout: () => void;
}

const TOKEN_KEY = "platform-auth-token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(payload: { email: string; password: string; role: "recruiter" | "candidate" }) {
        const credentials = { email: payload.email, password: payload.password };
        const data = payload.role === "candidate" ? await loginCandidate(credentials) : await loginRecruiter(credentials);
        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
      },
      async register(
        payload:
          | {
              role: "recruiter";
              name: string;
              email: string;
              password: string;
              phone?: string;
              position?: string;
              companyName: string;
              companyIndustry: string;
              companyWebsite?: string;
            }
          | {
              role: "candidate";
              name: string;
              email: string;
              password: string;
              phone?: string;
              professionalTitle?: string;
              location?: string;
            },
      ) {
        const data =
          payload.role === "candidate"
            ? await registerCandidate({
                name: payload.name,
                email: payload.email,
                password: payload.password,
                phone: payload.phone,
                professionalTitle: payload.professionalTitle,
                location: payload.location,
              })
            : await registerRecruiter({
                name: payload.name,
                email: payload.email,
                password: payload.password,
                phone: payload.phone,
                position: payload.position,
                companyName: payload.companyName,
                companyIndustry: payload.companyIndustry,
                companyWebsite: payload.companyWebsite,
              });

        localStorage.setItem(TOKEN_KEY, data.token);
        setUser(data.user);
      },
      logout() {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
