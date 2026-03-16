import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─── Demo API (replace with real backend calls) ────────────────────────────────
const API = {
  async getTodayStats() {
    return DEMO_DATA.todayStats;
  },
  async getRecentActivities() {
    return DEMO_DATA.recentActivities;
  },
  async getWeeklyProgress() {
    return DEMO_DATA.weeklyProgress;
  },
  async getTrackingStatus() {
    return DEMO_DATA.trackingStatus;
  },
  async startTracking() {
    return { success: true, sessionId: "demo-session-001", startedAt: new Date().toISOString() };
  },
  async stopTracking() {
    return { success: true };
  },
};

const DEMO_DATA = {
  todayStats: {
    steps: 8432,
    stepsGoal: 10000,
    calories: 1240,
    caloriesGoal: 2000,
    distance: 6.2,
    distanceGoal: 10,
    activeMinutes: 47,
    activeMinutesGoal: 60,
    heartRate: 72,
  },
  recentActivities: [
    { id: 1, type: "Run", name: "Morning Run", duration: 32, distance: 4.8, calories: 410, pace: "6:40", date: "Today, 06:45 AM", icon: "🏃" },
    { id: 2, type: "Cycle", name: "Evening Ride", duration: 55, distance: 18.3, calories: 620, pace: "3:00", date: "Yesterday, 05:30 PM", icon: "🚴" },
    { id: 3, type: "Walk", name: "Lunch Walk", duration: 22, distance: 1.9, calories: 130, pace: "11:35", date: "Yesterday, 12:15 PM", icon: "🚶" },
    { id: 4, type: "Run", name: "Interval Training", duration: 40, distance: 5.6, calories: 490, pace: "7:08", date: "Mar 6, 07:00 AM", icon: "🏃" },
    { id: 5, type: "Swim", name: "Pool Session", duration: 45, distance: 1.5, calories: 380, pace: "30:00", date: "Mar 5, 07:00 AM", icon: "🏊" },
  ],
  weeklyProgress: [
    { day: "Mon", steps: 9200, calories: 1800, distance: 7.1, activeMin: 55 },
    { day: "Tue", steps: 7800, calories: 1550, distance: 5.9, activeMin: 42 },
    { day: "Wed", steps: 11200, calories: 2100, distance: 8.8, activeMin: 70 },
    { day: "Thu", steps: 6500, calories: 1300, distance: 4.9, activeMin: 35 },
    { day: "Fri", steps: 9800, calories: 1950, distance: 7.6, activeMin: 62 },
    { day: "Sat", steps: 12400, calories: 2400, distance: 9.7, activeMin: 85 },
    { day: "Sun", steps: 8432, calories: 1240, distance: 6.2, activeMin: 47 },
  ],
  trackingStatus: { isTracking: false, sessionId: null, elapsed: 0 },
};

function useInterval(callback, delay) {
  const ref = useRef(callback);
  useEffect(() => { ref.current = callback; }, [callback]);
  useEffect(() => {
    if (delay == null) return;
    const id = setInterval(() => ref.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SectionHeader({ title, subtitle, dot, inline }) {
  return (
    <div className={inline ? "flex items-center gap-3" : "mb-5"}>
      <div className="flex items-center gap-3">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, unit, max, color, icon, animate }) {
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) return;
    let current = 0;
    const step = Math.ceil(value / 60);
    const id = setInterval(() => {
      current = Math.min(current + step, value);
      setDisplay(current);
      if (current >= value) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [value, animate]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</div>
          <div className="mt-1 text-2xl font-bold text-white">{typeof display === "number" ? display.toLocaleString() : display}</div>
          <div className="mt-1 text-xs text-slate-400">
            <span className={color}>{unit}</span> · goal 
          </div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function StartTracking({ onTrackingChange }) {
  const [isTracking, setIsTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [stats, setStats] = useState({ steps: 0, distance: 0, calories: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.getTrackingStatus().then((s) => {
      setIsTracking(s.isTracking);
      setElapsed(s.elapsed || 0);
      setSessionId(s.sessionId);
    });
  }, []);

  useInterval(() => {
    if (!isTracking) return;
    setElapsed((e) => e + 1);
    setStats((s) => ({
      steps: s.steps + Math.floor(Math.random() * 3),
      distance: +(s.distance + 0.001 * Math.random()).toFixed(3),
      calories: +(s.calories + 0.05 * Math.random()).toFixed(1),
    }));
  }, isTracking ? 1000 : null);

  async function toggle() {
    setLoading(true);
    try {
      if (!isTracking) {
        const res = await API.startTracking();
        setSessionId(res.sessionId);
        setIsTracking(true);
        setElapsed(0);
        onTrackingChange?.(true);
      } else {
        await API.stopTracking(sessionId);
        setIsTracking(false);
        setSessionId(null);
        onTrackingChange?.(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
            <span className={`h-2 w-2 rounded-full ${isTracking ? "bg-cyan-400 animate-pulse" : "bg-slate-700"}`} />
            <span>{isTracking ? "Session Active" : "Ready to Move"}</span>
          </div>
          <div className="text-3xl font-bold text-white">{isTracking ? fmtDuration(elapsed) : "Start Your Run"}</div>
          {isTracking && (
            <div className="flex flex-wrap gap-3 text-sm text-slate-300">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">Steps</div>
                <div className="mt-1 text-lg font-semibold text-cyan-200">{stats.steps.toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">Distance</div>
                <div className="mt-1 text-lg font-semibold text-purple-200">{stats.distance.toFixed(2)} km</div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-xs uppercase tracking-widest text-slate-400">Calories</div>
                <div className="mt-1 text-lg font-semibold text-amber-200">{stats.calories.toFixed(0)} kcal</div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          disabled={loading}
          className={`flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform duration-200 ${loading ? "opacity-60" : "hover:scale-105"} ${isTracking ? "bg-linear-to-br from-red-500 to-rose-600" : "bg-linear-to-br from-cyan-500 to-blue-600"}`}
        >
          {isTracking ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}

function TodayStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.getTodayStats().then(setStats);
  }, []);

  if (!stats) return <div className="text-slate-400">Loading stats…</div>;

  const cards = [
    { label: "Steps", value: stats.steps, unit: "steps", color: "text-cyan-300", icon: "👟" },
    { label: "Calories", value: stats.calories, unit: "kcal", color: "text-amber-300", icon: "🔥" },
    { label: "Distance", value: stats.distance, unit: "km", color: "text-purple-300", icon: "📍" },
    { label: "Active Min", value: stats.activeMinutes, unit: "min", color: "text-emerald-300", icon: "⚡" },
  ];

  return (
    <section className="mb-8">
      <SectionHeader title="Today's Stats" subtitle={`Heart rate: ${stats.heartRate} bpm`} dot="bg-red-500" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="transition">
            <StatCard {...c} animate />
          </div>
        ))}
      </div>
    </section>
  );
}

function MapPreview() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    const routePts = [[60, 80], [130, 60], [200, 95], [280, 70], [340, 110], [400, 90], [460, 130]];

    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = "rgba(34, 211, 238, 0.35)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    routePts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.beginPath();
    routePts.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = "#22d3ee";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(routePts[0][0], routePts[0][1], 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a78bfa";
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(routePts[routePts.length - 1][0], routePts[routePts.length - 1][1], 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#475569";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    routePts.slice(1, -1).filter((_, i) => i % 2 === 0).forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, []);

  return (
    <section className="mb-8">
      <SectionHeader title="Map Preview" subtitle="Last recorded route" dot="bg-cyan-400" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <canvas ref={canvasRef} width={560} height={220} className="w-full block" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-cyan-200">Start</span>
          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-purple-300">End</span>
        </div>
        <div className="absolute bottom-4 right-4 rounded-xl bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
          Demo map (replace with real map API)
        </div>
      </div>
    </section>
  );
}

const CHART_TABS = ["Steps", "Calories", "Distance", "Active Min"];
const CHART_KEYS = ["steps", "calories", "distance", "activeMin"];
const CHART_COLORS = ["#22d3ee", "#fb923c", "#a78bfa", "#34d399"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm text-slate-200">
      <div className="text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-white">{payload[0].value.toLocaleString()}</div>
    </div>
  );
}

function WeeklyProgress() {
  const [data, setData] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    API.getWeeklyProgress().then(setData);
  }, []);

  const key = CHART_KEYS[tab];
  const color = CHART_COLORS[tab];
  const total = data.reduce((a, d) => a + (d[key] || 0), 0);
  const avg = data.length ? Math.round(total / data.length) : 0;

  return (
    <section className="mb-8">
      <SectionHeader title="Weekly Progress" subtitle={`${new Date().toLocaleDateString("en-US", { month: "long" })} · This week`} dot="bg-emerald-400" />
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {CHART_TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === i ? "bg-white text-slate-900" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >
              {t}
            </button>
          ))}
          <div className="ml-auto flex flex-col items-end text-xs text-slate-400">
            <span>Total {total.toLocaleString()}</span>
            <span>Avg {avg.toLocaleString()}</span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id={`grad-${tab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#grad-${tab})`}
              dot={{ fill: color, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

const typeColors = { Run: "#22d3ee", Cycle: "#a78bfa", Walk: "#34d399", Swim: "#38bdf8" };

function ActivityRow({ activity }) {
  const [hovered, setHovered] = useState(false);
  const c = typeColors[activity.type] || "#6b7280";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${hovered ? "border-slate-600 bg-white/5" : "border-transparent bg-white/0"}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${c}15`, border: `1px solid ${c}30` }}>
            <span className="text-xl">{activity.icon}</span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-white">{activity.name}</div>
            <div className="text-xs text-slate-400">{activity.date}</div>
          </div>
        </div>

        <div className="flex gap-4 text-right text-sm">
          {[
            { label: "Duration", value: `${activity.duration}m` },
            { label: "Distance", value: `${activity.distance}km` },
            { label: "Calories", value: `${activity.calories}` },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
              <div className="text-base font-semibold text-slate-100">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="rounded-full bg-white/10 px-3 py-1" style={{ border: `1px solid ${c}30`, color: c }}>
          Pace
        </span>
        <span className="text-sm font-semibold text-white">{activity.pace}</span>
      </div>
    </div>
  );
}

function RecentActivities() {
  const [activities, setActivities] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.getRecentActivities().then(setActivities);
  }, []);

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <SectionHeader title="Recent Activities" subtitle={`${activities.length} recorded`} dot="bg-purple-400" inline />
        <button
          onClick={() => navigate("/activities")}
          className="rounded-full border border-cyan-500/30 bg-transparent px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
        >
          View All →
        </button>
      </div>
      <div className="grid gap-3">
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-10 text-center text-sm text-slate-400">No activities yet. Start tracking!</div>
        ) : (
          activities.map((a) => <ActivityRow key={a.id} activity={a} />)
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const user = useSelector((s) => s.user);
  const [isTracking, setIsTracking] = useState(false);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white">
                {greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                {isTracking ? "You're on a session. Keep going! 💪" : "Ready to crush today's goals?"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              <span>Sidebar expands on hover</span>
            </div>
          </div>
        </header>

        <StartTracking onTrackingChange={setIsTracking} />
        <TodayStats />

        <div className="grid gap-8 lg:grid-cols-2">
          <MapPreview />
          <WeeklyProgress />
        </div>

        <RecentActivities />
      </div>
    </div>
  );
}
