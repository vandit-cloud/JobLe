import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "../lib/utils";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (title: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      showToast(title: string, variant: ToastVariant = "info") {
        const id = Date.now();
        setToasts((current) => [...current, { id, title, variant }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3500);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "glass-panel pointer-events-auto flex items-center gap-3 px-4 py-3",
              toast.variant === "success" && "border-emerald-200",
              toast.variant === "error" && "border-red-200",
            )}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : toast.variant === "error" ? (
              <CircleAlert className="h-5 w-5 text-red-600" />
            ) : (
              <Info className="h-5 w-5 text-tide" />
            )}
            <p className="text-sm font-medium text-slate-700">{toast.title}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
