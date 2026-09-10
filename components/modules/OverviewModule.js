"use client";

import { motion } from "framer-motion";
import { Gauge, Layers, Compass, Zap, ArrowRight } from "lucide-react";
import { VEHICLE_PRESETS } from "../../lib/vehiclePresets";
import DiamondDiagram3D from "../DiamondDiagram3D";

const PANEL = "qnav-panel p-4";

function StatCard({ label, value, sub, color, icon: Icon, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={PANEL}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <div className="text-2xl font-bold mt-1.5 font-mono" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-1">{sub}</div>}
    </motion.div>
  );
}

export default function OverviewModule({ params, rows, geometry, noiseBudget, trajectoryMeta, onNavigate }) {
  const preset = VEHICLE_PRESETS[params.vehicleType];

  const meanAbsErr = rows.reduce((a, r) => a + Math.abs(r.B_total_meas_nT - r.B_total_true_nT), 0) / rows.length;
  const errs = rows.map((r) => r.B_total_meas_nT - r.B_total_true_nT);
  const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
  const stdErr = Math.sqrt(errs.reduce((a, b) => a + (b - meanErr) ** 2, 0) / errs.length);

  const statusRows = [
    { label: "Vehicle", value: `${preset.icon} ${preset.label}`, detail: `${params.speed.toFixed(0)} m/s @ ${params.startAlt.toFixed(0)} m` },
    { label: "Mission mode", value: trajectoryMeta.useWaypoints ? "Waypoint route" : "Synthetic demo pattern", detail: trajectoryMeta.useWaypoints ? `${(trajectoryMeta.totalDist / 1000).toFixed(1)} km path` : "Add 2+ points in Location" },
    { label: "Duration", value: `${trajectoryMeta.duration.toFixed(0)} s`, detail: `${rows.length} samples @ ${params.dt} Hz` },
    { label: "Ensemble", value: `${params.nDiamonds} diamonds`, detail: params.nDiamonds === 4 ? "Tetrahedral [111]" : "Fibonacci-sphere spread" },
  ];

  const navCards = [
    { id: "vehicle", label: "Vehicle & Motion", desc: "Type, speed, altitude, climb", icon: Compass, color: "#2563eb" },
    { id: "location", label: "Location & Route", desc: "World map, waypoints, timing", icon: Gauge, color: "#059669" },
    { id: "ensemble", label: "Sensor Ensemble", desc: "3D geometry, noise budget", icon: Layers, color: "#6d28d9" },
    { id: "analysis", label: "Analysis", desc: "Reconstruction quality charts", icon: Zap, color: "#c2650c" },
  ];

  return (
    <div className="space-y-6 qnav-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Mission Control</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live in-browser NV-diamond ensemble simulation. Adjust any module — everything recomputes instantly.
        </p>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Samples" value={rows.length} sub={`${trajectoryMeta.duration.toFixed(0)}s runtime`} color="#1e293b" icon={Gauge} delay={0} />
        <StatCard label="Mean |error|" value={`${meanAbsErr.toFixed(1)} nT`} sub="reconstructed vs true" color="#0e7490" icon={Zap} delay={0.05} />
        <StatCard label="Error σ" value={`${stdErr.toFixed(1)} nT`} sub="ensemble reconstruction" color="#c2650c" icon={Layers} delay={0.1} />
        <StatCard label="Shot noise" value={`${noiseBudget.shotNoiseStdNT.toFixed(1)} nT`} sub={`t=${noiseBudget.integrationTimeS}s integration`} color="#059669" icon={Compass} delay={0.15} />
      </section>

      <section className="grid lg:grid-cols-[1fr_260px] gap-5">
        <div className={PANEL}>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Mission parameters</h2>
          <div className="divide-y divide-border/60">
            {statusRows.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-xs text-gray-500">{s.label}</span>
                <div className="text-right">
                  <div className="text-sm text-gray-800 font-medium">{s.value}</div>
                  <div className="text-[11px] text-gray-600">{s.detail}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className={PANEL}>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">Live ensemble</h2>
          <DiamondDiagram3D geometry={geometry} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Jump to module</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {navCards.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              whileHover={{ y: -2, borderColor: c.color }}
              onClick={() => onNavigate(c.id)}
              className="qnav-panel p-4 text-left group transition-colors"
            >
              <c.icon size={18} style={{ color: c.color }} />
              <div className="text-sm font-medium text-gray-800 mt-2">{c.label}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{c.desc}</div>
              <div className="flex items-center gap-1 text-[11px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.color }}>
                Open <ArrowRight size={11} />
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
