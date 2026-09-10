"use client";

import { useMemo, useState } from "react";
import { Download, FileJson, Gauge } from "lucide-react";
import { rowsToCsv, downloadCsv } from "../../lib/csv";
import { interpolateToMs, MS_INTERVAL_PRESETS } from "../../lib/interpolate";

const PANEL = "qnav-panel p-5";

const BASE_COLS = [
  "time_s", "lat_deg", "lon_deg", "alt_m", "Px_m", "Py_m", "Pz_m",
  "roll_deg", "pitch_deg", "yaw_deg", "Bx_true_nT", "By_true_nT",
  "Bz_true_nT", "B_total_true_nT",
];
const TAIL_COLS = ["Bx_meas_nT", "By_meas_nT", "Bz_meas_nT", "B_total_meas_nT"];

// Interpolated exports show ms-resolution timing alongside the original
// time_s column, so downstream tools can key off either.
function msRowsToCsv(msRows, allCols) {
  const cols = ["time_ms", ...allCols];
  const header = cols.join(",");
  const lines = msRows.map((row) =>
    cols
      .map((c) => {
        const v = row[c];
        if (v === undefined || v === null) return "";
        return typeof v === "number" ? (Number.isInteger(v) ? v : v.toFixed(4)) : v;
      })
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export default function ExportModule({ rows, params }) {
  const diamondCols = Array.from({ length: params.nDiamonds }, (_, i) => `B_proj_D${i + 1}_nT`);
  const allCols = [...BASE_COLS, ...diamondCols, ...TAIL_COLS];

  const [intervalMs, setIntervalMs] = useState(10);
  const msRows = useMemo(() => interpolateToMs(rows, intervalMs), [rows, intervalMs]);

  const handleCsv = () => {
    const csv = rowsToCsv(rows, params.nDiamonds);
    downloadCsv(`nv_ensemble_${params.vehicleType}_${params.nDiamonds}diamonds.csv`, csv);
  };

  const handleJson = () => {
    const blob = new Blob([JSON.stringify(rows, null, 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nv_ensemble_${params.vehicleType}_${params.nDiamonds}diamonds.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMsCsv = () => {
    const csv = msRowsToCsv(msRows, allCols);
    downloadCsv(`nv_ensemble_${params.vehicleType}_${params.nDiamonds}diamonds_${intervalMs}ms.csv`, csv);
  };

  const handleMsJson = () => {
    const blob = new Blob([JSON.stringify(msRows, null, 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nv_ensemble_${params.vehicleType}_${params.nDiamonds}diamonds_${intervalMs}ms.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 qnav-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Data Export</h1>
        <p className="text-gray-500 text-sm mt-1">Download the current simulation run — recalculates from whatever is set right now.</p>
      </div>

      <div className={PANEL}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-800 font-medium">{rows.length.toLocaleString()} rows</div>
            <div className="text-[11px] text-gray-500">{allCols.length} columns · {params.nDiamonds} diamond channels</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCsv}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan to-emerald-400 text-white font-semibold text-xs px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition shadow-glow"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleJson}
              className="flex items-center gap-1.5 border border-border text-gray-600 font-medium text-xs px-4 py-2.5 rounded-lg hover:border-cyan/50 hover:text-cyan transition"
            >
              <FileJson size={14} /> JSON
            </button>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 mb-2">Columns included</div>
        <div className="flex flex-wrap gap-1.5">
          {allCols.map((c) => (
            <span key={c} className="px-2 py-1 rounded-md bg-slate-50 border border-border text-[10px] font-mono text-gray-600">
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={15} className="text-cyan" />
          <h2 className="text-sm font-semibold text-gray-800">High-resolution export (ms interpolation)</h2>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">
          Upsamples the 1s-spaced simulation to a finer time base via linear interpolation between
          adjacent samples — adds a <span className="font-mono">time_ms</span> column alongside every
          existing field. Useful for feeding downstream tools that expect sub-second timing.
        </p>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-sm text-gray-800 font-medium">{msRows.length.toLocaleString()} rows</div>
            <div className="text-[11px] text-gray-500">{allCols.length + 1} columns · {intervalMs} ms spacing</div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500" htmlFor="ms-interval-select">
              Interval
            </label>
            <select
              id="ms-interval-select"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-gray-700"
            >
              {MS_INTERVAL_PRESETS.map((p) => (
                <option key={p.ms} value={p.ms}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleMsCsv}
              className="flex items-center gap-1.5 bg-gradient-to-r from-cyan to-emerald-400 text-white font-semibold text-xs px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition shadow-glow"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleMsJson}
              className="flex items-center gap-1.5 border border-border text-gray-600 font-medium text-xs px-4 py-2.5 rounded-lg hover:border-cyan/50 hover:text-cyan transition"
            >
              <FileJson size={14} /> JSON
            </button>
          </div>
        </div>

        {intervalMs <= 5 && (
          <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {intervalMs} ms spacing generates a large file for long runs ({msRows.length.toLocaleString()} rows) —
            consider a coarser interval if you only need approximate sub-second timing.
          </div>
        )}
      </div>
    </div>
  );
}
