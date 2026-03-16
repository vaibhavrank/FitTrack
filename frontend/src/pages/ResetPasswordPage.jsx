import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "../components/auth/Field";
import EyeIcon from "../components/auth/EyeIcon";
import PasswordBar from "../components/auth/PasswordBar";
import { resetPassword } from "../services/authService";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token");
  const email = new URLSearchParams(window.location.search).get("email");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [done, setDone] = useState(false);

  function validate() {
    const e = {};
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Minimum 8 characters";
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = "Include at least one special character";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleReset() {
    if (!validate()) return;
    setLoading(true);
    setApiError("");
    try {
      await resetPassword(token, password,email);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-all duration-300">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/30">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-white font-semibold">Password reset! Redirecting…</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-white font-bold text-xl">Set new password</p>
                <p className="text-gray-400 text-sm mt-1">Must be 8+ characters with a special character.</p>
              </div>
              {apiError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {apiError}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Field
                  label="New Password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  error={errors.password}
                  placeholder="New password"
                  rightEl={<span onClick={() => setShowPw(!showPw)}><EyeIcon open={showPw} /></span>}
                />
                <PasswordBar password={password} />
              </div>
              <Field
                label="Confirm Password"
                type={showCf ? "text" : "password"}
                value={confirm}
                onChange={setConfirm}
                error={errors.confirm}
                placeholder="Confirm password"
                rightEl={<span onClick={() => setShowCf(!showCf)}><EyeIcon open={showCf} /></span>}
              />
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase
                           bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                           text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 transition-all"
              >
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
