import { useState } from "react";
import Field from "../../components/auth/Field";
import { forgotPassword } from "../../services/authService";

export default function ForgotPasswordForm({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const LINK_MINS = 15;

  async function handleSend() {
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email");
      return;
    }

    setError("");
    setLoading(true);
    setApiError("");

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5 items-center text-center">
        <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/30">
          <svg
            className="w-8 h-8 text-cyan-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Check your inbox</p>
          <p className="text-gray-400 text-sm mt-1">
            Reset link sent to <span className="text-cyan-400">{email}</span>.<br />
            Link is valid for <span className="text-white font-medium">{LINK_MINS} minutes</span>.
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
        >
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-white font-semibold text-lg">Forgot your password?</p>
        <p className="text-gray-400 text-sm mt-1">
          Enter your email and we'll send you a reset link valid for {LINK_MINS} minutes.
        </p>
      </div>
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {apiError}
        </div>
      )}
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          setError("");
        }}
        error={error}
        placeholder="you@example.com"
      />
      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase
                   bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                   text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Sending…" : "Send Reset Link"}
      </button>
      <button
        onClick={onBack}
        className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors text-center"
      >
        ← Back to login
      </button>
    </div>
  );
}
