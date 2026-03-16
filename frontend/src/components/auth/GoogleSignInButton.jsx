import { useEffect, useMemo, useState } from "react";
import { FaGoogle } from "react-icons/fa";

const GOOGLE_SDK_SRC = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({
  onSuccess,
  onError,
  className = "",
  label = "Continue with Google",
  disabled: externalDisabled = false,
}) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const disabled = externalDisabled || !clientId || !!loadError || !ready;

  const statusMessage = useMemo(() => {
    if (!clientId) return "Set VITE_GOOGLE_CLIENT_ID in .env";
    if (loadError) return "Failed to load Google SDK";
    if (!ready) return "Loading…";
    return null;
  }, [clientId, loadError, ready]);

  useEffect(() => {
    if (!clientId) return;

    if (window.google?.accounts?.id) {
      setReady(true);
      return;
    }

    const existingScript = document.querySelector(`script[src=\"${GOOGLE_SDK_SRC}\"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => setReady(true));
      existingScript.addEventListener("error", () => setLoadError(true));
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    script.onerror = () => setLoadError(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [clientId]);

  useEffect(() => {
    if (!ready || !clientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) {
          onSuccess?.(response.credential);
        } else {
          const error = new Error("Google sign-in failed");
          onError?.(error);
        }
      },
      auto_select: false,
    });
  }, [ready, clientId, onSuccess, onError]);

  const handleClick = () => {
    if (disabled) return;
    if (!window.google?.accounts?.id) {
      setLoadError(true);
      onError?.(new Error("Google SDK not loaded"));
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        onError?.(new Error("Google sign-in was cancelled"));
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={
          "relative w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase overflow-hidden group transition-all bg-white/10 hover:bg-white/20 text-white shadow-lg shadow-cyan-900/20 disabled:opacity-50 disabled:cursor-not-allowed " +
          className
        }
        type="button"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          <FaGoogle className="text-lg" />
          <span>{label}</span>
        </span>
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      {statusMessage && (
        <p className="text-xs text-gray-400 text-center">{statusMessage}</p>
      )}
    </div>
  );
}
