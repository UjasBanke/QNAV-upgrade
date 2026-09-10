"use client";

import { motion } from "framer-motion";
import DiamondDiagram3D from "../DiamondDiagram3D";

const PANEL = "qnav-panel p-5";
const LABEL = "text-xs uppercase tracking-wide text-gray-500 mb-1.5 block";
const COLORS = ["#dc2626", "#0e7490", "#059669", "#c2650c", "#7c3aed", "#a16207", "#db2777", "#4d7c0f"];

export default function EnsembleModule({ params, setParams, geometry, noiseBudget }) {
  const update = (patch) => setParams((p) => ({ ...p, ...patch }));

  return (
    <div className="space-y-6 qnav-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Sensor Ensemble</h1>
        <p className="text-gray-500 text-sm mt-1">
          Diamond count and axis geometry, and the per-sample noise budget from Stage 6 physics.
          The 3D geometry and noise numbers below preview live — click <span className="text-cyan">Set Parameters</span> to apply them to the actual mission data.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-5">
        <div className={PANEL}>
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Live geometry (drag to rotate)</h2>
          <DiamondDiagram3D geometry={geometry} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
            {geometry.map((ax, i) => (
              <div key={i} className="text-[11px] font-mono flex items-center gap-1.5" style={{ color: COLORS[i % COLORS.length] }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                D{i + 1}: ({ax.nx.toFixed(2)}, {ax.ny.toFixed(2)}, {ax.nz.toFixed(2)})
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className={PANEL}>
            <label className={LABEL}>Number of diamonds: <span className="text-cyan font-mono">{params.nDiamonds}</span></label>
            <input
              type="range"
              min={3}
              max={8}
              step={1}
              value={params.nDiamonds}
              onChange={(e) => update({ nDiamonds: Number(e.target.value) })}
              className="w-full accent-cyan"
            />
            <motion.p key={params.nDiamonds} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-gray-500 mt-2">
              {params.nDiamonds === 4
                ? "N=4 uses the natural tetrahedral [111] NV crystallographic axes — the standard real-device geometry."
                : `N=${params.nDiamonds} uses an evenly-spread Fibonacci-sphere axis set, guaranteed non-coplanar for any N≥3.`}
            </motion.p>
          </div>

          <div className={PANEL}>
            <label className={LABEL}>
              Integration time: <span className="text-cyan font-mono">{params.integrationTimeS.toFixed(1)} s</span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={params.integrationTimeS}
              onChange={(e) => update({ integrationTimeS: Number(e.target.value) })}
              className="w-full accent-cyan"
            />

            <label className={LABEL + " mt-4"}>
              Injected anomaly amplitude: <span className="text-cyan font-mono">{params.anomalyAmplitude.toFixed(0)} nT</span>
            </label>
            <input
              type="range"
              min={0}
              max={400}
              step={10}
              value={params.anomalyAmplitude}
              onChange={(e) => update({ anomalyAmplitude: Number(e.target.value) })}
              className="w-full accent-accentOrange"
            />
          </div>

          <div className={PANEL}>
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Stage 6 noise budget</h2>
            <div className="space-y-2 font-mono text-xs">
              <Row label="η_NV (sensitivity)" value={`${noiseBudget.etaNv.toFixed(1)} nT/√Hz`} />
              <Row label="Shot noise (per sample)" value={`${noiseBudget.shotNoiseStdNT.toFixed(2)} nT`} highlight />
              <Row label="Thermal drift walk" value="0.05 nT/step" />
              <Row label="Fixed bias (per diamond)" value="σ = 5.0 nT" />
            </div>
            <p className="text-[11px] text-gray-600 mt-3">
              η_NV = (P_F / γ_NV) · (Δν / (C·√R₀)), per the Qnami NV-ODMR sensitivity formula (Eq. 4).
              Shot-noise std = η_NV / √t.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? "text-cyan font-semibold" : "text-gray-800"}>{value}</span>
    </div>
  );
}
