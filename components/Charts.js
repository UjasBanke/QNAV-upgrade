"use client";

import { useRef } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { ImageDown, FileCode2 } from "lucide-react";
import { downloadSvgFromContainer, downloadPngFromContainer } from "../lib/chartExport";

const tooltipStyle = {
  backgroundColor: "rgba(255,255,255,0.98)",
  border: "1px solid #cbd8e0",
  borderRadius: 10,
  color: "#1e293b",
  fontSize: 12,
  boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
};

const GRID_STROKE = "#e2e8f0";
const AXIS_STROKE = "#64748b";

function paddedDomain(values, padFrac = 0.12) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.1 || 100;
  const pad = span * padFrac;
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

// Wraps a chart with a title, optional subtitle, and PNG/SVG download
// buttons. The chart itself is given a responsive height via CSS
// breakpoints (rather than a fixed pixel height) so it scales cleanly
// from phones up to wide desktop layouts.
export function ChartCard({ title, subtitle, filename = "chart", children }) {
  const containerRef = useRef(null);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => downloadPngFromContainer(containerRef.current, `${filename}.png`)}
            className="qnav-chart-btn"
            title="Download as PNG"
          >
            <ImageDown size={12} /> PNG
          </button>
          <button
            type="button"
            onClick={() => downloadSvgFromContainer(containerRef.current, `${filename}.svg`)}
            className="qnav-chart-btn"
            title="Download as SVG"
          >
            <FileCode2 size={12} /> SVG
          </button>
        </div>
      </div>
      <div ref={containerRef} className="w-full h-[220px] sm:h-[300px] lg:h-[340px]">
        {children}
      </div>
    </div>
  );
}

export function ReconstructionChart({ rows }) {
  const domain = paddedDomain(rows.flatMap((r) => [r.B_total_true_nT, r.B_total_meas_nT]));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
        <defs>
          <linearGradient id="trueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="time_s"
          stroke={AXIS_STROKE}
          fontSize={11}
          label={{ value: "time (s)", position: "insideBottom", offset: -3, fill: AXIS_STROKE, fontSize: 11 }}
        />
        <YAxis
          stroke={AXIS_STROKE}
          fontSize={11}
          domain={domain}
          label={{ value: "nT", angle: -90, position: "insideLeft", fill: AXIS_STROKE, fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="B_total_true_nT" name="True B_total" stroke="#059669" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line type="monotone" dataKey="B_total_meas_nT" name="Reconstructed B_total" stroke="#0e7490" dot={false} strokeWidth={1.6} strokeOpacity={0.95} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Stage 7b: reconstructed B_total after a centered moving-average /
// boxcar filter, plotted against ground truth. Replaces the old raw
// (spiky) reconstruction chart — the smoothing column (`B_total_meas_nT_smooth`)
// is expected to already be present on each row (see lib/smoothing.js).
export function SmoothedReconstructionChart({ rows, window = 9 }) {
  const domain = paddedDomain(rows.flatMap((r) => [r.B_total_true_nT, r.B_total_meas_nT_smooth]));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={rows} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="time_s"
          stroke={AXIS_STROKE}
          fontSize={11}
          label={{ value: "time (s)", position: "insideBottom", offset: -3, fill: AXIS_STROKE, fontSize: 11 }}
        />
        <YAxis
          stroke={AXIS_STROKE}
          fontSize={11}
          domain={domain}
          label={{ value: "nT", angle: -90, position: "insideLeft", fill: AXIS_STROKE, fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="B_total_true_nT" name="True B_total" stroke="#059669" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="B_total_meas_nT_smooth"
          name={`Reconstructed (smoothed, ${window}-sample)`}
          stroke="#0e7490"
          dot={false}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ErrorChart({ rows }) {
  const withErr = rows.map((r) => ({ ...r, err: r.B_total_meas_nT - r.B_total_true_nT }));
  const domain = paddedDomain(withErr.map((r) => r.err));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={withErr} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis
          dataKey="time_s"
          stroke={AXIS_STROKE}
          fontSize={11}
          label={{ value: "time (s)", position: "insideBottom", offset: -3, fill: AXIS_STROKE, fontSize: 11 }}
        />
        <YAxis
          stroke={AXIS_STROKE}
          fontSize={11}
          domain={domain}
          label={{ value: "error (nT)", angle: -90, position: "insideLeft", fill: AXIS_STROKE, fontSize: 11 }}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <ReferenceLine y={0} stroke="#94a3b8" />
        <Line type="monotone" dataKey="err" name="Reconstruction error" stroke="#dc2626" dot={false} strokeWidth={1.5} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
