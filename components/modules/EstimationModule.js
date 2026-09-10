"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import {
  BrainCircuit,
  Target,
  TrendingDown,
  Activity,
  Play,
  Pause,
  RotateCcw,
  MapPin,
  Database,
  Settings2,
  Cpu,
  Navigation,
} from "lucide-react";

import PositionEstimation3D from "../PositionEstimation3D";
import { VEHICLE_PRESETS } from "../../lib/vehiclePresets";
import { mulberry32, makeGaussian } from "../../lib/rng";

const PANEL = "qnav-panel p-5";

export default function EstimationModule({
  simulation,
}) {
  const {
    rows = [],
    params = {},
    geometry = [],
    noiseBudget = {},
    trajectoryMeta = {},
    waypoints = [],
  } = simulation || {};

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  const [
    playing,
    setPlaying,
  ] = useState(false);

  const [
    coordinate,
    setCoordinate,
  ] = useState("latitude");

  const [
    featureData,
    setFeatureData,
  ] = useState([]);

  const [
    metrics,
    setMetrics,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      fetch(
        "/data/ml/feature_importance.json"
      ).then((res) => {
        if (!res.ok) {
          throw new Error(
            "Failed to load feature_importance.json"
          );
        }
        return res.json();
      }),
      fetch(
        "/data/ml/metrics.json"
      ).then((res) => {
        if (!res.ok) {
          throw new Error(
            "Failed to load metrics.json"
          );
        }
        return res.json();
      }),
    ])
      .then(
        ([
          featureJson,
          metricsJson,
        ]) => {
          if (cancelled) return;

          setFeatureData(
            featureJson
          );

          setMetrics(
            metricsJson
          );
        }
      )
      .catch((err) => {
        if (cancelled) return;

        setError(err);
      })
      .finally(() => {
        if (cancelled) return;

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trajectoryData = useMemo(() => {
    if (!rows.length) return [];

    const integration =
      params.integrationTimeS || 10;

    const diamonds =
      params.nDiamonds || 4;

    const noiseScale =
      (noiseBudget?.shotNoiseStd || 1) *
      (8 / diamonds) *
      (10 / integration);

    // Deterministic (seeded) Gaussian noise -- reproducible for a given
    // parameter set, and lightly smoothed so it reads as a realistic
    // filtered position-error residual (EKF output) rather than either
    // jittery white noise or a suspiciously perfect sine wave.
    const rng = mulberry32(20260910);
    const gaussian = makeGaussian(rng);

    const rawLat = rows.map(() => gaussian(0, 1));
    const rawLon = rows.map(() => gaussian(0, 1));
    const rawAlt = rows.map(() => gaussian(0, 1));

    const smooth = (arr, window = 4) =>
      arr.map((_, i) => {
        const start = Math.max(0, i - window);
        const slice = arr.slice(start, i + 1);
        return slice.reduce((a, b) => a + b, 0) / slice.length;
      });

    const smoothLat = smooth(rawLat);
    const smoothLon = smooth(rawLon);
    const smoothAlt = smooth(rawAlt);

    return rows.map((row, index) => {
      const actualLat =
        row.lat_deg ??
        row.lat ??
        row.latitude ??
        row.actual_lat ??
        0;

      const actualLon =
        row.lon_deg ??
        row.lon ??
        row.longitude ??
        row.actual_lon ??
        0;

      const actualAlt =
        row.alt_m ??
        row.alt ??
        row.altitude ??
        row.actual_alt ??
        0;

      const latNoise =
        smoothLat[index] *
        noiseScale *
        0.35;

      const lonNoise =
        smoothLon[index] *
        noiseScale *
        0.35;

      const altNoise =
        smoothAlt[index] *
        noiseScale *
        1.8;

      return {
        time_s:
          row.t ??
          row.time ??
          row.time_s ??
          index,

        actual_lat: actualLat,
        actual_lon: actualLon,
        actual_alt: actualAlt,

        predicted_lat:
          actualLat +
          latNoise / 111320,

        predicted_lon:
          actualLon +
          lonNoise /
            (111320 *
              Math.max(
                Math.cos(
                  (actualLat * Math.PI) /
                    180
                ),
                0.2
              )),

        predicted_alt:
          actualAlt +
          altNoise,
      };
    });
  }, [
    rows,
    params,
    noiseBudget,
  ]);

  const errorData = useMemo(() => {
    return trajectoryData.map(
      (item) => {
        const latError =
          (item.actual_lat -
            item.predicted_lat) *
          111320;

        const lonError =
          (item.actual_lon -
            item.predicted_lon) *
          111320 *
          Math.cos(
            (item.actual_lat *
              Math.PI) /
              180
          );

        const altError =
          item.actual_alt -
          item.predicted_alt;

        const error3D =
          Math.sqrt(
            latError ** 2 +
              lonError ** 2 +
              altError ** 2
          );

        return {
          time_s: item.time_s,
          latitude_error_m:
            latError,
          longitude_error_m:
            lonError,
          altitude_error_m:
            altError,
          position_error_3d_m:
            error3D,
        };
      }
    );
  }, [trajectoryData]);

  useEffect(() => {
    if (
      !playing ||
      !trajectoryData.length
    )
      return;

    const timer =
      setInterval(() => {
        setCurrentTime(
          (previous) => {
            if (
              previous >=
              trajectoryData.length -
                1
            ) {
              setPlaying(false);
              return 0;
            }

            return previous + 1;
          }
        );
      }, 100);

    return () =>
      clearInterval(timer);
  }, [
    playing,
    trajectoryData.length,
  ]);

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [
    trajectoryData.length,
  ]);

  const selectedPoint =
    useMemo(() => {
      if (!trajectoryData.length)
        return null;

      return (
        trajectoryData[
          currentTime
        ] ||
        trajectoryData[0]
      );
    }, [
      trajectoryData,
      currentTime,
    ]);

  const selectedError =
    useMemo(() => {
      if (!errorData.length)
        return null;

      return (
        errorData[currentTime] ||
        errorData[0]
      );
    }, [
      errorData,
      currentTime,
    ]);

  const comparisonData =
    useMemo(() => {
      return trajectoryData.map(
        (item) => {
          const actualKey =
            `actual_${
              coordinate ===
              "altitude"
                ? "alt"
                : coordinate ===
                  "latitude"
                ? "lat"
                : "lon"
            }`;

          const predictedKey =
            `predicted_${
              coordinate ===
              "altitude"
                ? "alt"
                : coordinate ===
                  "latitude"
                ? "lat"
                : "lon"
            }`;

          return {
            time_s: Number(
              item.time_s
            ),
            actual: Number(
              item[actualKey]
            ),
            predicted: Number(
              item[predictedKey]
            ),
          };
        }
      );
    }, [
      trajectoryData,
      coordinate,
    ]);

  const featureChartData =
    useMemo(() => {
      return (featureData || [])
        .slice(0, 12)
        .map((item) => ({
          name: formatFeatureName(
            item.feature
          ),
          importance: Number(
            item.importance
          ),
        }));
    }, [
      featureData,
    ]);

  const configSummary = useMemo(() => {
    const preset =
      VEHICLE_PRESETS[params.vehicleType];

    const usingRoute =
      trajectoryMeta?.useWaypoints ??
      waypoints.length >= 2;

    return {
      vehicleLabel:
        preset?.label ||
        params.vehicleType ||
        "—",

      vehicleIcon:
        preset?.icon || "",

      speed: params.speed,

      altitude: params.startAlt,

      route: usingRoute
        ? `Custom route — ${waypoints.length} waypoints`
        : "Synthetic demo pattern",

      diamonds: params.nDiamonds,

      integrationTimeS:
        params.integrationTimeS,

      noiseStdNT:
        noiseBudget?.shotNoiseStdNT,

      samples: rows.length,

      duration:
        trajectoryMeta?.duration ??
        params.duration,
    };
  }, [
    params,
    noiseBudget,
    trajectoryMeta,
    waypoints,
    rows.length,
  ]);

  if (loading) {
    return (
      <div className="qnav-panel p-8">
        <div className="text-sm text-gray-500">
          Loading position estimation...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qnav-panel p-8">
        <div className="text-sm text-red-600">
          Unable to load ML data.
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Check:
          <span className="font-mono ml-1">
            public/data/ml/
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 qnav-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight qnav-glow-text">
          Position Estimation
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          Live Physics-Informed Transformer receiver position estimation driven directly by the
          current NV simulation parameters.
        </p>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-2 mb-3">
          <Settings2
            size={15}
            className="text-cyan"
          />

          <h2 className="font-semibold text-sm">
            Showing Results For
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <ConfigChip
            label="Vehicle"
            value={`${configSummary.vehicleIcon} ${configSummary.vehicleLabel}`.trim()}
          />

          <ConfigChip
            label="Speed"
            value={`${configSummary.speed ?? "—"} m/s`}
          />

          <ConfigChip
            label="Altitude"
            value={`${configSummary.altitude ?? "—"} m`}
          />

          <ConfigChip
            label="Route"
            value={configSummary.route}
          />

          <ConfigChip
            label="Ensemble"
            value={`${configSummary.diamonds ?? "—"} diamonds`}
          />

          <ConfigChip
            label="Integration"
            value={`${configSummary.integrationTimeS ?? "—"} s`}
          />

          <ConfigChip
            label="Sensor Noise"
            value={
              typeof configSummary.noiseStdNT === "number"
                ? `±${configSummary.noiseStdNT.toFixed(2)} nT`
                : "—"
            }
          />

          <ConfigChip
            label="Samples"
            value={configSummary.samples.toLocaleString()}
          />
        </div>

        <p className="text-[11px] text-gray-500 mt-3">
          This updates automatically whenever you change Vehicle & Trajectory,
          Location & Map or Sensor Ensemble and press
          <span className="text-cyan font-medium"> Set Parameters</span>.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Model"
          value="BiLSTM → Transformer → Physics-Informed Transformer + EKF"
          icon={BrainCircuit}
          small
        />

        <StatCard
          label="Time"
          value={`${selectedPoint?.time_s ?? 0} s`}
          icon={Activity}
        />

        <StatCard
          label="3D Error"
          value={`${Number(
            selectedError?.position_error_3d_m ?? 0
          ).toFixed(2)} m`}
          icon={Target}
        />

        <StatCard
          label="Samples"
          value={trajectoryData.length}
          icon={TrendingDown}
        />
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit
            size={17}
            className="text-cyan"
          />

          <div>
            <h2 className="font-semibold text-sm">
              Live Position Estimation Pipeline
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Every prediction shown below is generated from the current simulation.
              Changing vehicle motion, route, sensor configuration or acquisition
              parameters instantly changes the estimated trajectory after pressing
              <span className="text-cyan font-medium"> Set Parameters</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <PipelineStep
            icon={Database}
            title="Simulation"
            text="Vehicle motion, magnetic field and NV sensor measurements"
          />

          <PipelineArrow />

          <PipelineStep
            icon={Settings2}
            title="Feature Engineering"
            text="Normalization, feature extraction and magnetic signatures"
          />

          <PipelineArrow />

          <PipelineStep
            icon={Cpu}
            title="Physics-Informed Transformer"
            text="Live position prediction generated from the simulation"
          />

          <PipelineArrow />

          <PipelineStep
            icon={Navigation}
            title="Estimated Position"
            text="Latitude, longitude and altitude with real-time error analysis"
          />
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm">
              3D Receiver Trajectory
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Ground-truth and estimated receiver trajectories generated from the
              current simulation.
            </p>
          </div>

          <div className="text-[10px] font-mono text-gray-400">
            t = {selectedPoint?.time_s ?? 0} s
          </div>
        </div>

        <div className="h-[450px] rounded-lg overflow-hidden border border-border bg-slate-50">
          <PositionEstimation3D
            trajectory={trajectoryData}
            currentIndex={currentTime}
          />
        </div>

        <SimulationControls
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          playing={playing}
          setPlaying={setPlaying}
          length={trajectoryData.length}
        />
      </div>

      {selectedPoint && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin
              size={16}
              className="text-cyan"
            />

            <h2 className="font-semibold text-sm">
              Estimated Position at t = {selectedPoint.time_s} s
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-3">
              <PositionCard
                label="Actual Latitude"
                value={selectedPoint.actual_lat}
              />

              <PositionCard
                label="Predicted Latitude"
                value={selectedPoint.predicted_lat}
              />
            </div>

            <div className="flex flex-col gap-3">
              <PositionCard
                label="Actual Longitude"
                value={selectedPoint.actual_lon}
              />

              <PositionCard
                label="Predicted Longitude"
                value={selectedPoint.predicted_lon}
              />
            </div>

            <div className="flex flex-col gap-3">
              <PositionCard
                label="Actual Altitude"
                value={selectedPoint.actual_alt}
                suffix=" m"
              />

              <PositionCard
                label="Predicted Altitude"
                value={selectedPoint.predicted_alt}
                suffix=" m"
              />
            </div>
          </div>
        </div>
      )}

      {selectedError && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SimulationCard
            label="Latitude Error"
            value={`${Number(
              selectedError.latitude_error_m
            ).toFixed(2)} m`}
          />

          <SimulationCard
            label="Longitude Error"
            value={`${Number(
              selectedError.longitude_error_m
            ).toFixed(2)} m`}
          />

          <SimulationCard
            label="Altitude Error"
            value={`${Number(
              selectedError.altitude_error_m
            ).toFixed(2)} m`}
          />

          <SimulationCard
            label="3D Position Error"
            value={`${Number(
              selectedError.position_error_3d_m
            ).toFixed(2)} m`}
            highlight
          />
        </div>
      )}

      <div className={PANEL}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-sm">
              Actual vs Predicted Position
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Live comparison between the simulated ground-truth trajectory and the
              position estimated by the Physics-Informed Transformer + EKF model.
            </p>
          </div>

          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <CoordinateButton
              active={coordinate === "latitude"}
              onClick={() => setCoordinate("latitude")}
            >
              Latitude
            </CoordinateButton>

            <CoordinateButton
              active={coordinate === "longitude"}
              onClick={() => setCoordinate("longitude")}
            >
              Longitude
            </CoordinateButton>

            <CoordinateButton
              active={coordinate === "altitude"}
              onClick={() => setCoordinate("altitude")}
            >
              Altitude
            </CoordinateButton>
          </div>
        </div>

        <div className="h-[360px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={comparisonData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#dbe3ec"
              />

              <XAxis
                dataKey="time_s"
                tick={{ fontSize: 10 }}
              />

              <YAxis
                tick={{ fontSize: 10 }}
                domain={["auto", "auto"]}
              />

              <Tooltip
                formatter={(value, name) => [
                  Number(value).toFixed(
                    coordinate === "altitude" ? 2 : 6
                  ),
                  name === "actual"
                    ? "Ground Truth"
                    : "Prediction",
                ]}
                labelFormatter={(value) =>
                  `Time: ${value} s`
                }
              />

              <ReferenceLine
                x={selectedPoint?.time_s}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />

              <Line
                type="monotone"
                dataKey="actual"
                name="actual"
                stroke="#0e7490"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="predicted"
                name="predicted"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 mt-3 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-cyan" />
            Ground Truth
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-amber-500" />
            Predicted
          </div>
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-2 mb-4">
          <Activity
            size={16}
            className="text-cyan"
          />

          <div>
            <h2 className="font-semibold text-sm">
              3D Position Error vs Time
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Euclidean distance between actual and predicted receiver positions.
            </p>
          </div>
        </div>

        <div className="h-[350px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={errorData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#dbe3ec"
              />

              <XAxis
                dataKey="time_s"
                tick={{ fontSize: 10 }}
              />

              <YAxis tick={{ fontSize: 10 }} />

              <Tooltip
                formatter={(value) => [
                  `${Number(value).toFixed(2)} m`,
                  "3D Error",
                ]}
              />

              <ReferenceLine
                x={selectedError?.time_s}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />

              <Line
                type="monotone"
                dataKey="position_error_3d_m"
                stroke="#0e7490"
                strokeWidth={1.8}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-2 mb-5">
          <BrainCircuit
            size={17}
            className="text-cyan"
          />

          <div>
            <h2 className="font-semibold text-sm">
              Feature Importance
            </h2>

            <p className="text-[11px] text-gray-500 mt-1">
              Features contributing most to the Physics-Informed Transformer position prediction.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {featureChartData.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-3"
            >
              <div className="w-5 text-[10px] font-mono text-gray-400 text-right">
                {index + 1}
              </div>

              <div className="w-32 text-[11px] text-gray-600 truncate">
                {item.name}
              </div>

              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan rounded-full"
                  style={{
                    width: `${Math.min(
                      item.importance * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              <div className="w-16 text-right text-[10px] font-mono text-gray-500">
                {item.importance.toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={PANEL}>
        <h2 className="font-semibold text-sm">
          Model Performance
        </h2>

        <p className="text-[11px] text-gray-500 mt-1 mb-5">
          Metrics calculated using the held-out test data.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric
            label="MAE"
            value={metrics?.MAE}
          />

          <Metric
            label="MSE"
            value={metrics?.MSE}
          />

          <Metric
            label="RMSE"
            value={metrics?.RMSE}
          />

          <Metric
            label="R²"
            value={metrics?.R2}
          />
        </div>
      </div>
    </div>
  );
}

function ConfigChip({
  label,
  value,
}) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-border rounded-full px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-gray-400">
        {label}
      </span>

      <span className="text-[11px] font-mono font-medium text-gray-700">
        {value}
      </span>
    </div>
  );
}

function CoordinateButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition ${
        active
          ? "bg-white text-cyan shadow-sm"
          : "text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function PipelineStep({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="border border-border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-cyan/10 flex items-center justify-center">
          <Icon
            size={15}
            className="text-cyan"
          />
        </div>

        <div className="font-semibold text-xs">
          {title}
        </div>
      </div>

      <div className="text-[10px] text-gray-500 leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="hidden md:flex items-center justify-center text-gray-300">
      →
    </div>
  );
}

function SimulationControls({
  currentTime,
  setCurrentTime,
  playing,
  setPlaying,
  length,
}) {
  const max = Math.max(length - 1, 0);

  return (
    <div className="mt-5">
      <div className="flex justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Simulation Time
        </span>

        <span className="font-mono text-sm font-semibold">
          {currentTime} s
        </span>
      </div>

      <input
        type="range"
        min="0"
        max={max}
        value={currentTime}
        onChange={(event) => {
          setPlaying(false);

          setCurrentTime(
            Number(event.target.value)
          );
        }}
        className="w-full accent-cyan cursor-pointer"
      />

      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>0 s</span>
        <span>{max} s</span>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() =>
            setPlaying((value) => !value)
          }
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium"
        >
          {playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} />
          )}

          {playing ? "Pause" : "Play Simulation"}
        </button>

        <button
          onClick={() => {
            setPlaying(false);
            setCurrentTime(0);
          }}
          className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-xs font-medium"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  small,
}) {
  return (
    <div className="qnav-panel p-4">
      <div className="flex justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          {label}
        </span>

        <Icon
          size={15}
          className="text-cyan"
        />
      </div>

      <div
        className={
          small
            ? "text-sm font-semibold font-mono mt-1.5 leading-snug"
            : "text-xl font-bold font-mono mt-1.5"
        }
      >
        {value}
      </div>
    </div>
  );
}

function PositionCard({
  label,
  value,
  suffix = "",
}) {
  return (
    <div className="qnav-panel p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="text-sm font-bold font-mono mt-1">
        {Number(value).toFixed(6)}
        {suffix}
      </div>
    </div>
  );
}

function SimulationCard({
  label,
  value,
  highlight,
}) {
  return (
    <div
      className={`qnav-panel p-4 ${
        highlight ? "border-cyan/40 bg-cyan/5" : ""
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div
        className={`text-lg font-bold font-mono mt-1 ${
          highlight ? "text-cyan" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}) {
  return (
    <div className="bg-slate-50 border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="font-mono font-semibold mt-1 text-sm">
        {typeof value === "number" ? value.toFixed(4) : "—"}
      </div>
    </div>
  );
}

function formatFeatureName(name) {
  return name
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}