"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, Globe2, Route, Waypoints, Clock } from "lucide-react";

const WorldMapReal = dynamic(() => import("../WorldMapReal"), { ssr: false });

const PANEL = "qnav-panel p-5";
const LABEL = "text-xs uppercase tracking-wide text-gray-500 mb-1.5 block";
const INPUT = "w-full bg-white border border-border rounded-md px-2.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:border-cyan/60 font-mono";

export default function LocationModule({
  waypoints,
  activeWaypointId,
  setActiveWaypointId,
  addWaypoint,
  updateWaypoint,
  removeWaypoint,
  viewMode,
  setViewMode,
  rows,
  params,
  setParams,
  trajectoryMeta,
}) {
  const update = (patch) => setParams((p) => ({ ...p, ...patch }));
  const [mapHovered, setMapHovered] = useState(false);

  return (
    <div className="space-y-6 qnav-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Location & Route</h1>
          <p className="text-gray-500 text-sm mt-1">
            Click the map to drop waypoints, or type exact coordinates below.
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("world")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
              viewMode === "world" ? "bg-cyan/15 text-cyan" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Globe2 size={13} /> World view
          </button>
          <button
            onClick={() => setViewMode("trajectory")}
            disabled={waypoints.length < 2}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors border-l border-border disabled:opacity-30 ${
              viewMode === "trajectory" ? "bg-cyan/15 text-cyan" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Route size={13} /> Route view
          </button>
        </div>
      </div>

      <div className={PANEL}>
        <div
          className="relative"
          onMouseEnter={() => setMapHovered(true)}
          onMouseLeave={() => setMapHovered(false)}
        >
          <WorldMapReal
            waypoints={waypoints}
            activeId={activeWaypointId}
            onAddPoint={addWaypoint}
            onSelectPoint={setActiveWaypointId}
            rows={rows}
            viewMode={viewMode}
          />

          {/* Key route parameters — shown as an overlay on the map itself
              while hovering, reflecting whatever is currently applied. */}
          <AnimatePresence>
            {mapHovered && trajectoryMeta && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="qnav-map-hover-info"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
                  <Waypoints size={12} className="text-cyan" />
                  {trajectoryMeta.useWaypoints ? "Waypoint route" : "Synthetic demo pattern"}
                </div>
                <div className="mt-1 space-y-0.5 text-[11px] font-mono text-gray-600">
                  {trajectoryMeta.useWaypoints && (
                    <div>{(trajectoryMeta.totalDist / 1000).toFixed(1)} km path</div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-gray-400" />
                    Duration {trajectoryMeta.duration.toFixed(0)} s
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-[11px] text-gray-600 mt-2">
          {waypoints.length === 0
            ? "No waypoints placed — using the synthetic demo pattern centered near the last picked point."
            : waypoints.length === 1
            ? "Add one more point to define a real point-to-point route."
            : `${waypoints.length}-point route active — duration is derived from path length ÷ speed.`}
        </p>
      </div>

      <div className={PANEL}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Waypoints</h2>
          <button
            onClick={() => addWaypoint(params.startLat ?? 23.02, params.startLon ?? 72.57)}
            className="flex items-center gap-1 text-[11px] text-cyan hover:text-cyan/80"
          >
            <Plus size={13} /> Add point
          </button>
        </div>

        {waypoints.length === 0 && (
          <p className="text-xs text-gray-600 py-3">No waypoints yet — click the map above.</p>
        )}

        <div className="space-y-2">
          <AnimatePresence>
            {waypoints.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => setActiveWaypointId(w.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                  activeWaypointId === w.id ? "border-cyan/50 bg-cyan/5" : "border-border hover:border-gray-600"
                }`}
              >
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-mono text-gray-400">
                  {i + 1}
                </span>
                <input
                  type="number"
                  step="0.0001"
                  value={w.lat}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateWaypoint(w.id, Number(e.target.value), w.lon)}
                  className={INPUT + " w-28"}
                />
                <input
                  type="number"
                  step="0.0001"
                  value={w.lon}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateWaypoint(w.id, w.lat, Number(e.target.value))}
                  className={INPUT + " w-28"}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWaypoint(w.id);
                  }}
                  className="ml-auto text-gray-600 hover:text-accentRed p-1"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className={PANEL + " grid sm:grid-cols-2 gap-4"}>
        <div>
          <label className={LABEL}>Start date</label>
          <input type="date" className={INPUT} value={params.startDate} onChange={(e) => update({ startDate: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Start time (UTC)</label>
          <input type="time" className={INPUT} value={params.startTime} onChange={(e) => update({ startTime: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL}>
            Demo pattern duration (only used when fewer than 2 waypoints are placed): {params.duration}s
          </label>
          <input
            type="range"
            min={60}
            max={1800}
            step={30}
            value={params.duration}
            onChange={(e) => update({ duration: Number(e.target.value) })}
            className="w-full accent-cyan"
          />
        </div>
      </div>
    </div>
  );
}
