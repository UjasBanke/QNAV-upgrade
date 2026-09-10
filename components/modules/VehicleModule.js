"use client";

import { motion } from "framer-motion";
import { VEHICLE_PRESETS, clamp } from "../../lib/vehiclePresets";

const PANEL = "qnav-panel p-5";
const LABEL = "text-xs uppercase tracking-wide text-gray-500 mb-1.5 block";
const SLIDER = "w-full accent-cyan";

export default function VehicleModule({ params, setParams }) {
  const preset = VEHICLE_PRESETS[params.vehicleType];
  const update = (patch) => setParams((p) => ({ ...p, ...patch }));

  const handleVehicleChange = (vt) => {
    const p = VEHICLE_PRESETS[vt];
    update({
      vehicleType: vt,
      speed: p.defaultSpeed,
      startAlt: clamp(p.defaultAlt, p.altRange[0], p.altRange[1]),
      climbRate: p.allowClimb ? p.defaultClimbRate : 0,
      turnRate: p.defaultTurnRate,
      altMin: p.altRange[0],
      altMax: p.altRange[1],
    });
  };

  return (
    <div className="space-y-6 qnav-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Vehicle & Motion</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pick a platform — speed and altitude ranges are validated to that platform's real operating envelope.
          Changes here won't affect the simulation until you click <span className="text-cyan">Set Parameters</span> below.
        </p>
      </div>

      <div className={PANEL}>
        <label className={LABEL}>Vehicle type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {Object.entries(VEHICLE_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => handleVehicleChange(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg border text-xs transition-all ${
                params.vehicleType === key
                  ? "border-cyan/60 bg-cyan/10 text-cyan shadow-glow"
                  : "border-border text-gray-400 hover:border-gray-600 hover:text-gray-800"
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              {p.label.split(" (")[0]}
            </button>
          ))}
        </div>

        <motion.div key={params.vehicleType} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div>
            <label className={LABEL}>
              Speed: <span className="text-cyan font-mono">{params.speed.toFixed(0)} m/s</span>
              <span className="text-gray-600"> ({(params.speed * 3.6).toFixed(0)} km/h — range {preset.speedRange[0]}–{preset.speedRange[1]} m/s)</span>
            </label>
            <input
              type="range"
              min={preset.speedRange[0]}
              max={preset.speedRange[1]}
              step={1}
              value={params.speed}
              onChange={(e) => update({ speed: Number(e.target.value) })}
              className={SLIDER}
            />
          </div>

          <div>
            <label className={LABEL}>
              Altitude: <span className="text-cyan font-mono">{params.startAlt.toFixed(0)} m</span>
              <span className="text-gray-600"> (range {preset.altRange[0]}–{preset.altRange[1]} m)</span>
            </label>
            <input
              type="range"
              min={preset.altRange[0]}
              max={preset.altRange[1]}
              step={preset.altRange[1] > 1000 ? 50 : 1}
              value={params.startAlt}
              onChange={(e) => update({ startAlt: Number(e.target.value) })}
              className={SLIDER}
            />
          </div>

          <div>
            <label className={LABEL}>
              Climb rate:{" "}
              <span className="text-cyan font-mono">
                {preset.allowClimb ? `${params.climbRate.toFixed(1)} m/s` : "0 m/s"}
              </span>
              {!preset.allowClimb && <span className="text-gray-600"> — disabled for ground-level vehicles</span>}
            </label>
            <input
              type="range"
              min={0}
              max={preset.allowClimb ? 15 : 0}
              step={0.5}
              value={params.climbRate}
              disabled={!preset.allowClimb}
              onChange={(e) => update({ climbRate: Number(e.target.value) })}
              className={SLIDER + " disabled:opacity-25"}
            />
          </div>

          <div>
            <label className={LABEL}>
              Turn rate: <span className="text-cyan font-mono">{params.turnRate.toFixed(1)} °/s</span>
            </label>
            <input
              type="range"
              min={preset.turnRateRange[0]}
              max={preset.turnRateRange[1]}
              step={0.5}
              value={params.turnRate}
              onChange={(e) => update({ turnRate: Number(e.target.value) })}
              className={SLIDER}
            />
            <p className="text-[11px] text-gray-600 mt-1">
              Only used for the synthetic demo pattern (no effect once you've placed a waypoint route).
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
