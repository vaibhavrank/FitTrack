import { useState } from "react";
import { Link } from "react-router-dom";
import { cls } from "../components/auth/cls";
import { useToast } from "../components/ToastContext";
import LoginForm from "./auth/LoginForm";
import SignupForm from "./auth/SignupForm";
import ForgotPasswordForm from "./auth/ForgotPasswordForm";

export { ResetPasswordPage } from "./ResetPasswordPage";

export default function LoginSignUp() {
  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [view, setView] = useState("auth"); // "auth" | "forgot"
  const [signupOtpActive, setSignupOtpActive] = useState(false);
  const { showToast } = useToast();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 transition-all duration-300">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header strip */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-800">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-1 font-semibold">FitTrack</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              {view === "forgot" ? "Account Recovery" : tab === "login" ? "Welcome back" : "Join FitTrack"}
            </h1>
          </div>

          {/* Tabs — only shown on auth view */}
          {view === "auth" && (
            <div className="flex border-b border-gray-800">
              {['login', 'signup'].map((t) => {
                const isDisabled = signupOtpActive && t === 'login';
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (isDisabled) {
                        showToast("Finish verifying your email or cancel to switch tabs");
                        return;
                      }
                      setTab(t);
                    }}
                    className={cls(
                      "flex-1 py-3.5 text-sm font-semibold uppercase tracking-widest transition-all relative",
                      tab === t ? "text-white" : "text-gray-500 hover:text-gray-300",
                      isDisabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={isDisabled}
                  >
                    {t === "login" ? "Sign In" : "Sign Up"}
                    {tab === t && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Body */}
          <div className="px-8 py-7">
            {view === "forgot" ? (
              <ForgotPasswordForm onBack={() => setView("auth")} />
            ) : tab === "login" ? (
              <LoginForm onForgot={() => setView("forgot")} />
            ) : (
              <SignupForm onOtpActiveChange={setSignupOtpActive} />
            )}
          </div>

          {/* Footer */}
          {view === "auth" && (
            <div className="px-8 pb-7 text-center">
              <p className="text-gray-500 text-xs">
                {tab === "login" ? (
                  <>No account?{' '}
                    <button onClick={() => setTab("signup")}
                      className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">
                      Sign up free
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        if (signupOtpActive) {
                          showToast("Finish verifying your email or cancel to switch tabs");
                          return;
                        }
                        setTab("login");
                      }}
                      disabled={signupOtpActive}
                      className={cls(
                        "text-cyan-400 underline underline-offset-2 transition-colors",
                        signupOtpActive && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Back home link */}
        <div className="mt-5 text-center">
          <Link to="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
