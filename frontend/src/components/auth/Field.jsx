import { cls } from "./cls";

export default function Field({ label, type = "text", value, onChange, error, placeholder, rightEl }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls(
            "w-full bg-gray-800/60 border rounded-lg px-4 py-3 text-white placeholder-gray-600",
            "focus:outline-none focus:ring-2 transition-all text-sm",
            error
              ? "border-red-500/60 focus:ring-red-500/30"
              : "border-gray-700 focus:ring-cyan-500/30 focus:border-cyan-500/60"
          )}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">
            {rightEl}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}
