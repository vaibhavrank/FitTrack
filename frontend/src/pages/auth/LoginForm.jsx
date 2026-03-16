import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../slices/authSlice";
import Field from "../../components/auth/Field";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import OtpInput from "../../components/auth/OtpInput";
import Timer from "../../components/auth/Timer";
import { useToast } from "../../components/ToastContext";
import { sendOtp, verifyOtp, resendOtp, googleLogin, saveAuthFromResponse, decodeToken } from "../../services/authService";

export default function LoginForm({ onForgot }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("send"); // "send" | "verify"
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpExpired, setOtpExpired] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  function validateEmail() {
    const e = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function handleSendOtp() {
    if (!validateEmail()) return;
    setLoading(true);
    setApiError("");
    setOtpError("");

    try {
      await sendOtp(email);
      setStep("verify");
      setOtpExpired(false);
      setTimerKey((k) => k + 1);
    } catch (err) {
      console.log("Error sending OTP:", err);
      setApiError(err.message);

    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      setOtpError("Enter all 6 digits");
      return;
    }

    setLoading(true);
    setApiError("");
    setOtpError("");

    try {
      const data = await verifyOtp(email, otp);
      const token = saveAuthFromResponse(data);
      const decoded = token ? decodeToken(token) : null;
      const userPayload = {
        id: data.user_id ?? decoded?.sub ?? decoded?.id,
        email: decoded?.email ?? email,
        name: decoded?.name,
      };

      dispatch(login({ user: userPayload, token }));
      showToast("Logged in successfully");
      navigate("/");
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setOtp("");
    setOtpError("");
    setOtpExpired(false);
    setTimerKey((k) => k + 1);
    try {
      await resendOtp(email);
    } catch {
      // ignore; user can retry
    }
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
        email: decoded?.email,
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

  if (step === "verify") {
    return (
      <div className="flex flex-col gap-6 items-center text-center">
        <div>
          <p className="text-white font-semibold text-lg">Verify your email</p>
          <p className="text-gray-400 text-sm mt-1">
            We sent a 6-digit code to <span className="text-cyan-400">{email}</span>
          </p>
        </div>
        <Timer key={timerKey} seconds={300} onExpire={() => setOtpExpired(true)} />
        <OtpInput value={otp} onChange={setOtp} error={otpError} />
        <button
          onClick={handleVerifyOtp}
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
              onClick={handleResendOtp}
              className="text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2 transition-colors"
            >
              Resend OTP
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Didn&apos;t receive it?{' '}
            <button
              onClick={handleResendOtp}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              Resend
            </button>
          </p>
        )}
        <button
          onClick={() => {
            setStep("send");
            setOtp("");
            setOtpError("");
          }}
          className="text-xs text-gray-400 hover:text-gray-300 underline underline-offset-2 transition-colors"
        >
          ← Back to email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {apiError}
        </div>
      )}
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        error={errors.email}
        placeholder="you@example.com"
      />
      <button
        onClick={handleSendOtp}
        disabled={loading}
        className="relative w-full py-3 rounded-xl font-bold text-sm tracking-widest uppercase overflow-hidden group transition-all
                   bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                   text-white shadow-lg shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">{loading ? "Sending…" : "Send OTP"}</span>
        <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <div className="flex justify-between items-center">
        <button
          onClick={onForgot}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
        >
          Forgot password?
        </button>
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={loading || googleLoading}
          className="text-xs"
        />
      </div>
    </div>
  );
}
