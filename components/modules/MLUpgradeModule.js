"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { TrendingDown } from "lucide-react";
import { ChartCard } from "../Charts";
import data from "../../public/data/qnav_dashboard.json";

const PANEL = "qnav-panel p-5";

// Shorter display labels for the 5-way model comparison, keyed by the
// full model name used in stage9_model_comparison.csv / the exported JSON.
const MODEL_LABELS = {
  "BiLSTM": "BiLSTM",
  "Temporal Transformer": "Transformer",
  "Physics-Informed Transformer": "Physics-\nInformed",
  "Physics-Informed Transformer + Uncertainty": "+ Uncertainty",
  "Physics-Informed Transformer + Uncertainty + EKF": "+ EKF (final)",
};

const HIDDEN_METRIC_KEYS = new Set([
  "model",
  "p95_position_error_m",
  "max_position_error_m",
  "NLL",
  "coverage_95",
  "calibration_error",
]);

const BAR_COLORS = ["#94a3b8", "#64748b", "#0e7490", "#0369a1", "#0ea5e9"];

export default function MLUpgradeModule() {
  const comparison = data.model_comparison || [];
  const trajectory = data.trajectory || [];
  const finalMetrics = data.model_performance || {};

  const baseline = comparison[0];
  const finalModel = comparison[comparison.length - 1];
  const improvementPct =
    baseline && finalModel
      ? (((baseline.position_MAE_m - finalModel.position_MAE_m) / baseline.position_MAE_m) * 100).toFixed(0)
      : null;

  const barData = comparison.map((row, i) => ({
    name: MODEL_LABELS[row.model] || row.model,
    fullName: row.model,
    MAE: row.position_MAE_m,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }));

  const trajChartData = trajectory.map((p) => ({
    t: p.time_s,
    actual_error: 0,
    error_3d: p.position_error_3d_m,
    horizontal_error: p.horizontal_error_m,
  }));

  const positionChartData = trajectory.map((p) => ({
    t: p.time_s,
    actual_E: p.actual_E_m,
    predicted_E: p.predicted_E_m,
    actual_N: p.actual_N_m,
    predicted_N: p.predicted_N_m,
  }));

  return (
    <div className="space-y-6 qnav-fade-in">
      <Header />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat
          label="Final model MAE"
          value={finalModel ? `${finalModel.position_MAE_m.toFixed(1)} m` : "—"}
          color="#0369a1"
        />
        
        <MiniStat
          label="Improvement vs BiLSTM"
          value={improvementPct !== null ? `${improvementPct}%` : "—"}
          color="#15803d"
        />
      </div>

      <div className={PANEL}>
        <ChartCard
          title="Model comparison — mean position error"
          subtitle="BiLSTM and the Temporal Transformer are deep-learning baselines. Each step to the right adds a proposed component: the physics-informed loss, the uncertainty head, then EKF fusion."
          filename="model_comparison_MAE"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} height={50} />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                label={{ value: "Position MAE (m)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }}
              />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(1)} m`, "MAE"]}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                contentStyle={{ fontSize: 12, borderRadius: 10 }}
              />
              <Bar dataKey="MAE" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className={PANEL}>
        <ChartCard
          title="Actual vs predicted trajectory (East / North)"
          subtitle="Physics-Informed Transformer + EKF, one representative test mission."
          filename="trajectory_actual_vs_predicted"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={positionChartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "time (s)", position: "insideBottom", offset: -3, fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "metres", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="actual_E" stroke="#0f172a" dot={false} strokeWidth={2} name="Actual E" />
              <Line type="monotone" dataKey="predicted_E" stroke="#0ea5e9" dot={false} strokeWidth={2} strokeDasharray="4 3" name="Predicted E" />
              <Line type="monotone" dataKey="actual_N" stroke="#475569" dot={false} strokeWidth={2} name="Actual N" />
              <Line type="monotone" dataKey="predicted_N" stroke="#f59e0b" dot={false} strokeWidth={2} strokeDasharray="4 3" name="Predicted N" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className={PANEL}>
        <ChartCard
          title="Position error over time"
          subtitle="3D position error and horizontal-only error, Physics-Informed Transformer + EKF."
          filename="position_error_over_time"
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trajChartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "time (s)", position: "insideBottom", offset: -3, fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} label={{ value: "error (m)", angle: -90, position: "insideLeft", fontSize: 11, fill: "#64748b" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="error_3d" stroke="#dc2626" dot={false} strokeWidth={2} name="3D error" />
              <Line type="monotone" dataKey="horizontal_error" stroke="#0e7490" dot={false} strokeWidth={1.5} name="Horizontal error" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className={PANEL}>
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Final model metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {Object.entries(finalMetrics)
            .filter(([k]) => !HIDDEN_METRIC_KEYS.has(k))
            .map(([key, value]) => (
              <div key={key} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="text-gray-500 uppercase tracking-wide text-[10px]">{key}</div>
                <div className="font-mono font-semibold text-gray-800 mt-0.5">
                  {typeof value === "number" ? value.toFixed(3) : String(value)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="flex items-center gap-2">
        <TrendingDown size={20} className="text-cyan-600" />
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">
          AI Model Upgrade
        </h1>
      </div>
      <p className="text-gray-500 text-sm mt-1">
        Deep-learning navigation pipeline results: BiLSTM and Transformer baselines vs the
        proposed Physics-Informed Transformer with uncertainty estimation and EKF fusion.
      </p>
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
