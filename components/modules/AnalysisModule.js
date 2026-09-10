"use client";

import { SmoothedReconstructionChart, ErrorChart, ChartCard } from "../Charts";
import { smoothRows, DEFAULT_SMOOTH_WINDOW } from "../../lib/smoothing";

const PANEL = "qnav-panel p-5";
const SMOOTH_COLS = ["Bx_meas_nT", "By_meas_nT", "Bz_meas_nT", "B_total_meas_nT"];

export default function AnalysisModule({ rows }) {
  const meanAbsErr = rows.reduce((a, r) => a + Math.abs(r.B_total_meas_nT - r.B_total_true_nT), 0) / rows.length;
  const errs = rows.map((r) => r.B_total_meas_nT - r.B_total_true_nT);
  const meanErr = errs.reduce((a, b) => a + b, 0) / errs.length;
  const stdErr = Math.sqrt(errs.reduce((a, b) => a + (b - meanErr) ** 2, 0) / errs.length);
  const maxErr = Math.max(...errs.map(Math.abs));

  const smoothedRows = smoothRows(rows, SMOOTH_COLS, DEFAULT_SMOOTH_WINDOW);

  return (
    <div className="space-y-6 qnav-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">Analysis</h1>
        <p className="text-gray-500 text-sm mt-1">Ensemble reconstruction quality vs simulated ground truth.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Mean |error|" value={`${meanAbsErr.toFixed(1)} nT`} color="#0e7490" />
        <MiniStat label="Error σ" value={`${stdErr.toFixed(1)} nT`} color="#c2650c" />
        <MiniStat label="Max |error|" value={`${maxErr.toFixed(1)} nT`} color="#dc2626" />
        <MiniStat label="Bias (mean err)" value={`${meanErr.toFixed(1)} nT`} color="#6d28d9" />
      </div>

      <div className={PANEL}>
        <ChartCard
          title="Ensemble reconstruction vs ground truth (B_total, smoothed)"
          subtitle={`Centered ${DEFAULT_SMOOTH_WINDOW}-sample moving-average filter applied to the reconstructed vector (Stage 7b) — Y-axis auto-scales to the data range, not fixed at zero.`}
          filename="reconstruction_vs_ground_truth_smoothed"
        >
          <SmoothedReconstructionChart rows={smoothedRows} window={DEFAULT_SMOOTH_WINDOW} />
        </ChartCard>
      </div>

      <div className={PANEL}>
        <ChartCard
          title="B_total reconstruction error vs time"
          filename="reconstruction_error"
        >
          <ErrorChart rows={rows} />
        </ChartCard>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="qnav-panel p-3.5">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-bold font-mono mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
