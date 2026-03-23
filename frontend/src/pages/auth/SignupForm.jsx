import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../slices/authSlice";
import Field from "../../components/auth/Field";
import EyeIcon from "../../components/auth/EyeIcon";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import PasswordBar from "../../components/auth/PasswordBar";
import OtpInput from "../../components/auth/OtpInput";
import Timer from "../../components/auth/Timer";
import { useToast } from "../../components/ToastContext";
import { signup, sendOtp, verifyOtp, resendOtp, googleLogin, saveAuthFromResponse, decodeToken } from "../../services/authService";

import { useEffect } from "react";

export default function SignupForm({ onOtpActiveChange }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpExpired, setOtpExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const OTP_SECONDS = 300;

  useEffect(() => {
    onOtpActiveChange?.(step === "otp");
    return () => onOtpActiveChange?.(false);
  }, [step, onOtpActiveChange]);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    else {
      if (password.length < 8) e.password = "Minimum 8 characters";
      else if (!/[^A-Za-z0-9]/.test(password)) e.password = "Include at least one special character";
    }
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setApiError("");

    try {
      const res = await signup(name, email, password, confirm);
      console.log("Signup started", res);
      setStep("otp");
      setOtpExpired(false);
      setTimerKey((k) => k + 1);
    } catch (err) {
      console.log("Failed to start signup", err);
      setApiError(err.message || "Unable to start signup");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setOtp("");
    setOtpError("");
    setOtpExpired(false);
    setTimerKey((k) => k + 1);
    try {
      await resendOtp(email);
    } catch {
      // ignore failures; user can retry
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      setOtpError("Enter all 6 digits");
      return;
    }
    setLoading(true);
    setOtpError("");
    setApiError("");

    try {
      const data = await verifyOtp(email, otp);
      const token = saveAuthFromResponse(data);
      const decoded = token ? decodeToken(token) : null;
      const userPayload = {
        id: data.user_id ?? decoded?.sub ?? decoded?.id,
        email: decoded?.email ?? email,
        name: decoded?.name ?? name,
      };

      dispatch(login({ user: userPayload, token }));
      showToast("Logged in successfully");
      navigate("/");
    } catch (err) {
      console.log("OTP verification failed", err);
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCancelOtp() {
    setStep("form");
    setOtp("");
    setOtpError("");
    setOtpExpired(false);
    setTimerKey((k) => k + 1);
  }

  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSuccess(token) {
    setGoogleLoading(true);
    setApiError("");

    try {
      const data = await googleLogin(token);
      const accessToken = saveAuthFromResponse(data);
      const decoded = accessToken ? decodeToken(accessToken) : null;
      const userPayload = {
        id: data.user_id ?? decoded?.sub ?? decoded?.id,
        email: decoded?.email ?? email,
        name: decoded?.name,
      };

      dispatch(login({ user: userPayload, token: accessToken }));
      showToast("Logged in successfully");
      navigate("/");
    } catch (err) {
      setApiError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleGoogleError(err) {
    setApiError(err?.message || "Google login failed");
  }

  if (step === "otp") {
    return (
      <div className="flex flex-col gap-6 items-center text-center">
        <div>
          <p className="text-white font-semibold text-lg">Verify your email</p>
          <p className="text-gray-400 text-sm mt-1">
            We sent a 6-digit code to <span className="text-cyan-400">{email}</span>
          </p>
        </div>
        <Timer key={timerKey} seconds={OTP_SECONDS} onExpire={() => setOtpExpired(true)} />
        <OtpInput value={otp} onChange={setOtp} error={otpError} />
        <button
          onClick={handleVerify}
          disabled={loading || otpExpired}
          className="w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase
                     bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                     text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Verifying…" : "Verify OTP"}
        </button>
        {otpExpired ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-red-400 text-xs">OTP expired.</p>
            <button
              onClick={handleResend}
              className="text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2 transition-colors"
            >
              Resend OTP
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Didn&apos;t receive it?{' '}
            <button
              onClick={handleResend}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Resend
            </button>
          </p>
        )}
        <button
          type="button"
          onClick={handleCancelOtp}
          className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {apiError}
        </div>
      )}
      <GoogleSignInButton
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        disabled={loading || googleLoading}
      />
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex-1 border-t border-gray-700" />
        <span>or</span>
        <span className="flex-1 border-t border-gray-700" />
      </div>
      <Field label="Full Name" value={name} onChange={setName} error={errors.name} placeholder="John Doe" />
      <Field label="Email" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="you@example.com" />
      <div className="flex flex-col gap-1">
        <Field
          label="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder="Min. 8 chars + symbol"
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
        placeholder="••••••••"
        rightEl={<span onClick={() => setShowCf(!showCf)}><EyeIcon open={showCf} /></span>}
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="relative w-full py-3 mt-1 rounded-xl font-bold text-sm tracking-widest uppercase overflow-hidden group transition-all
                   bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                   text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">{loading ? "Creating account…" : "Create Account"}</span>
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
}
