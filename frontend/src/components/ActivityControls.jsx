import React from "react";

const ACTIVITIES = [
  { value: "walk", label: "Walk" },
  { value: "run", label: "Run" },
  { value: "cycle", label: "Cycle" },
];

export default function ActivityControls({
  activityType,
  onChangeActivityType,
  isTracking,
  onStartTracking,
  onStopTracking,
  onClearRoute,
  statusMessage,
  errorMessage,
}) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-white border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">Activity</label>
        <select
          value={activityType}
          onChange={(e) => onChangeActivityType(e.target.value)}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
        >
          {ACTIVITIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`rounded px-3 py-1 text-xs font-semibold text-white ${
            isTracking ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
          }`}
          onClick={isTracking ? onStopTracking : onStartTracking}
        >
          {isTracking ? "Stop" : "Start"}
        </button>

        <button
          type="button"
          className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-300"
          onClick={onClearRoute}
        >
          Reset route
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {statusMessage && <span className="text-gray-600">{statusMessage}</span>}
        {errorMessage && <span className="text-red-600">{errorMessage}</span>}
      </div>
    </div>
  );
}
