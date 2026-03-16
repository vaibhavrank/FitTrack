import { createContext, useContext, useMemo, useState } from "react";
import Toast from "./Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = (message, duration = 3000) => {
    setToast(message);
    window.setTimeout(() => setToast(null), duration);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast message={toast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const val = useContext(ToastContext);
  if (!val) throw new Error("useToast must be used within ToastProvider");
  return val;
}
