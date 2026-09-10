"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { geoEqualEarth } from "d3-geo";
import { animate } from "framer-motion";
import { Plus, Minus, Locate } from "lucide-react";

const GEO_URL = "/data/world.geojson";
const WIDTH = 800;
const HEIGHT = 420;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Convert a screen (clientX/Y) point into the SVG's own internal
// coordinate space (the WIDTH x HEIGHT viewBox), independent of how
// large the SVG is actually rendered on screen (it's responsive).
function screenToSvgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return [p.x, p.y];
}

export default function WorldMapReal({ waypoints, activeId, onAddPoint, onSelectPoint, rows, viewMode }) {
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const [tween, setTween] = useState(1);
  const [renderProjection, setRenderProjection] = useState(null);

  // pan/zoom transform applied on top of the world projection (world view only)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragState = useRef(null);

  const worldProjection = useMemo(
    () => geoEqualEarth().scale(128).translate([WIDTH / 2, HEIGHT / 2]),
    []
  );

  const trajProjection = useMemo(() => {
    if (!rows || rows.length < 2) return worldProjection;
    const step = Math.max(1, Math.floor(rows.length / 150));
    const coords = rows.filter((_, i) => i % step === 0).map((r) => [r.lon_deg, r.lat_deg]);
    const line = { type: "LineString", coordinates: coords };
    try {
      return geoEqualEarth().fitExtent(
        [
          [50, 50],
          [WIDTH - 50, HEIGHT - 50],
        ],
        line
      );
    } catch {
      return worldProjection;
    }
  }, [rows, worldProjection]);

  useEffect(() => {
    const target = viewMode === "trajectory" ? 1 : 0;
    const controls = animate(tween, target, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setTween(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, rows]);

  const activeProjection = useMemo(() => {
    const s = lerp(worldProjection.scale(), trajProjection.scale(), tween);
    const t0 = lerp(worldProjection.translate()[0], trajProjection.translate()[0], tween);
    const t1 = lerp(worldProjection.translate()[1], trajProjection.translate()[1], tween);
    const c0 = lerp(worldProjection.center()[0], trajProjection.center()[0], tween);
    const c1 = lerp(worldProjection.center()[1], trajProjection.center()[1], tween);
    return geoEqualEarth().scale(s).translate([t0, t1]).center([c0, c1]);
  }, [worldProjection, trajProjection, tween]);

  useEffect(() => {
    setRenderProjection(() => activeProjection);
  }, [activeProjection]);

  const inWorldView = viewMode === "world";

  // ---- zoom (wheel + buttons), centered on cursor for wheel ----
  const zoomBy = useCallback((factor, anchorSvgPoint) => {
    setView((v) => {
      const newK = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = newK / v.k;
      const [ax, ay] = anchorSvgPoint || [WIDTH / 2, HEIGHT / 2];
      return {
        k: newK,
        x: ax - (ax - v.x) * ratio,
        y: ay - (ay - v.y) * ratio,
      };
    });
  }, []);

  const handleWheel = (e) => {
    if (!inWorldView) return;
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const svgPt = screenToSvgPoint(svg, e.clientX, e.clientY);
    if (!svgPt) return;
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    zoomBy(factor, svgPt);
  };

  // ---- pan (pointer drag) + click-to-add (if no meaningful drag) ----
  const handlePointerDown = (e) => {
    if (!inWorldView) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    const svgPt = screenToSvgPoint(svg, e.clientX, e.clientY);
    dragState.current = {
      startSvg: svgPt,
      startView: { ...view },
      moved: 0,
      pointerId: e.pointerId,
    };
  };

  const handlePointerMove = (e) => {
    const ds = dragState.current;
    if (!ds || !inWorldView) return;
    const svg = svgRef.current;
    if (!svg) return;
    const svgPt = screenToSvgPoint(svg, e.clientX, e.clientY);
    if (!svgPt) return;
    const dx = svgPt[0] - ds.startSvg[0];
    const dy = svgPt[1] - ds.startSvg[1];
    ds.moved = Math.max(ds.moved, Math.hypot(dx, dy));
    setView({ k: ds.startView.k, x: ds.startView.x + dx, y: ds.startView.y + dy });
  };

  const handlePointerUp = (e) => {
    const ds = dragState.current;
    dragState.current = null;
    if (!ds || !inWorldView) return;
    const svg = svgRef.current;
    if (svg) {
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {}
    }
    // treat as a click only if the pointer barely moved
    if (ds.moved < 4) {
      const svgPt = screenToSvgPoint(svg, e.clientX, e.clientY);
      if (!svgPt) return;
      // undo the pan/zoom group transform to get coordinates in
      // projection space, then invert the projection to lon/lat
      const gx = (svgPt[0] - view.x) / view.k;
      const gy = (svgPt[1] - view.y) / view.k;
      const inverted = activeProjection.invert([gx, gy]);
      if (!inverted) return;
      const [lon, lat] = inverted;
      if (Math.abs(lat) > 85 || Math.abs(lon) > 180 || Number.isNaN(lon) || Number.isNaN(lat)) return;
      onAddPoint(lat, lon);
    }
  };

  const resetView = () => setView({ x: 0, y: 0, k: 1 });

  const trajPath = useMemo(() => {
    if (!rows || rows.length < 2 || !renderProjection) return "";
    const step = Math.max(1, Math.floor(rows.length / 200));
    let d = "";
    rows.forEach((r, i) => {
      if (i % step !== 0 && i !== rows.length - 1) return;
      const p = renderProjection([r.lon_deg, r.lat_deg]);
      if (!p) return;
      d += `${d === "" ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)} `;
    });
    return d;
  }, [rows, renderProjection]);

  const groupTransform = inWorldView ? `translate(${view.x} ${view.y}) scale(${view.k})` : undefined;

  return (
    <div ref={wrapperRef} className="relative select-none">
      <ComposableMap
        ref={svgRef}
        projection={renderProjection || worldProjection}
        width={WIDTH}
        height={HEIGHT}
        style={{
          width: "100%",
          height: "auto",
          cursor: !inWorldView ? "default" : dragState.current ? "grabbing" : "crosshair",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#eaf0f6" />

        <g transform={groupTransform}>
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#ffffff"
                  stroke="#7fb3c7"
                  strokeWidth={0.4 / (inWorldView ? view.k : 1)}
                  style={{
                    default: { outline: "none", opacity: 0.85 },
                    hover: { outline: "none", fill: "#dceaf1", opacity: 1 },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>

          {trajPath && (
            <path
              d={trajPath}
              fill="none"
              stroke="#c2650c"
              strokeWidth={2 / (inWorldView ? view.k : 1)}
              strokeLinecap="round"
              filter="url(#glow)"
              opacity={0.9}
            />
          )}

          {waypoints.map((wp) => {
            const p = activeProjection([wp.lon, wp.lat]);
            if (!p) return null;
            const r = (wp.id === activeId ? 6 : 4) / (inWorldView ? view.k : 1);
            return (
              <g
                key={wp.id}
                transform={`translate(${p[0]} ${p[1]})`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPoint(wp.id);
                }}
                style={{ cursor: "pointer" }}
              >
                <circle r={r} fill={wp.id === activeId ? "#0e7490" : "#64748b"} stroke="#ffffff" strokeWidth={1.5 / (inWorldView ? view.k : 1)} filter="url(#glow)" />
                {wp.id === activeId && (
                  <circle r={r * 2} fill="none" stroke="#0e7490" strokeWidth={1 / (inWorldView ? view.k : 1)} opacity={0.5}>
                    <animate attributeName="r" values={`${r};${r * 3};${r}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}
        </g>
      </ComposableMap>

      {inWorldView && (
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <button
            onClick={() => zoomBy(1.4, [WIDTH / 2, HEIGHT / 2])}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/95 border border-border text-cyan hover:bg-cyan/10 shadow-sm"
            title="Zoom in"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => zoomBy(1 / 1.4, [WIDTH / 2, HEIGHT / 2])}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/95 border border-border text-cyan hover:bg-cyan/10 shadow-sm"
            title="Zoom out"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={resetView}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/95 border border-border text-gray-500 hover:text-cyan hover:bg-cyan/10 shadow-sm"
            title="Reset view"
          >
            <Locate size={12} />
          </button>
        </div>
      )}

      {inWorldView && (
        <div className="absolute bottom-2 left-2 text-[10px] font-mono text-gray-600 bg-white/90 px-2 py-1 rounded-md border border-border shadow-sm">
          zoom {view.k.toFixed(1)}× — scroll or use +/− to zoom, drag to pan, click to place
        </div>
      )}
    </div>
  );
}
