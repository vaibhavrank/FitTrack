import { useRef } from "react";
import { cls } from "./cls";

export default function OtpInput({ value, onChange, error }) {
  const DIGITS = 6;
  const refs = useRef([]);
  const digits = (value + " ".repeat(DIGITS)).slice(0, DIGITS).split("");

  function handleChange(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    const combined = next.join("").replace(/ /g, "");
    onChange(combined);
    if (v && i < DIGITS - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) refs.current[i - 1]?.focus();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3">
        {Array.from({ length: DIGITS }, (_, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digits[i].trim()}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cls(
              "w-14 h-14 text-center text-2xl font-bold rounded-xl border bg-gray-800/60 text-white",
              "focus:outline-none focus:ring-2 transition-all",
              error
                ? "border-red-500/60 focus:ring-red-500/30"
                : "border-gray-700 focus:ring-cyan-500/40 focus:border-cyan-500/60"
            )}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
