import { mulberry32, makeGaussian } from "./rng";

const R_EARTH = 6378137.0; // m, WGS-84 equatorial radius

// ---------------------------------------------------------------------
// Stage 1: Trajectory generation (vehicle-aware)
// ---------------------------------------------------------------------
export function generateTrajectory(params) {
  const {
    dt = 1.0,
    duration = 600,
    speed = 60,
    startLat,
    startLon,
    startAlt = 0,
    climbRate = 0,
    turnRate = 3,
    allowClimb = true,
    altMin = 0,
    altMax = 12000,
  } = params;

  const n = Math.max(2, Math.floor(duration / dt));
  const t = new Array(n);
  const lat = new Array(n);
  const lon = new Array(n);
  const alt = new Array(n);
  const roll = new Array(n).fill(0);
  const pitch = new Array(n).fill(0);
  const yaw = new Array(n).fill(0);

  lat[0] = startLat;
  lon[0] = startLon;
  alt[0] = startAlt;
  t[0] = 0;

  let heading = 0;
  const climbPhaseEnd = duration * 0.16; // proportionally same as original 100/600
  const levelPhaseEnd = duration * 0.5; // proportionally same as original 300/600

  for (let i = 1; i < n; i++) {
    const time = i * dt;
    t[i] = time;

    let verticalSpeed = 0;
    let yawRate = 0;

    if (time < climbPhaseEnd && allowClimb) {
      verticalSpeed = climbRate;
      pitch[i] = 5.0;
      roll[i] = 0;
    } else if (time < levelPhaseEnd) {
      verticalSpeed = 0;
      pitch[i] = 0;
      roll[i] = 0;
    } else {
      yawRate = turnRate;
      pitch[i] = 0;
      roll[i] = turnRate > 0 ? 15.0 : 0;
    }

    heading = (heading + yawRate * dt) % 360;
    yaw[i] = heading;
    const headingRad = (heading * Math.PI) / 180;

    const dN = speed * Math.cos(headingRad) * dt;
    const dE = speed * Math.sin(headingRad) * dt;
    const dlat = (dN / R_EARTH) * (180 / Math.PI);
    const dlon = ((dE / (R_EARTH * Math.cos((lat[i - 1] * Math.PI) / 180))) * 180) / Math.PI;

    lat[i] = lat[i - 1] + dlat;
    lon[i] = lon[i - 1] + dlon;
    let nextAlt = alt[i - 1] + verticalSpeed * dt;
    nextAlt = Math.min(altMax, Math.max(altMin, nextAlt));
    alt[i] = nextAlt;
  }

  return { t, lat, lon, alt, roll, pitch, yaw, n };
}

// ---------------------------------------------------------------------
// Stage 1b: Waypoint-following trajectory (used when the user places 2+
// points on the map). Legs are straight lines in a local equirectangular
// projection about the first waypoint — consistent with the projection
// used elsewhere in the pipeline (Px/Py). Duration is derived from total
// path length / speed rather than set independently, since speed is a
// physical constraint once real distances are involved.
// ---------------------------------------------------------------------
export function generateWaypointTrajectory(params) {
  const { waypoints, speed, dt = 1.0, startAlt = 0, altMin = 0, altMax = 12000, allowClimb = true, climbFraction = 0.2 } = params;

  const lat0 = waypoints[0].lat;
  const lon0 = waypoints[0].lon;
  const lat0R = toRad(lat0);

  const toNE = (lat, lon) => {
    const dN = toRad(lat - lat0) * R_EARTH;
    const dE = toRad(lon - lon0) * R_EARTH * Math.cos(lat0R);
    return [dN, dE];
  };
  const fromNE = (dN, dE) => {
    const lat = lat0 + (dN / R_EARTH) * (180 / Math.PI);
    const lon = lon0 + (dE / (R_EARTH * Math.cos(lat0R))) * (180 / Math.PI);
    return [lat, lon];
  };

  const nePoints = waypoints.map((w) => toNE(w.lat, w.lon));
  const legs = [];
  let totalDist = 0;
  for (let i = 1; i < nePoints.length; i++) {
    const dN = nePoints[i][0] - nePoints[i - 1][0];
    const dE = nePoints[i][1] - nePoints[i - 1][1];
    const dist = Math.hypot(dN, dE);
    const heading = (Math.atan2(dE, dN) * 180) / Math.PI;
    legs.push({ dist, heading: (heading + 360) % 360, fromIdx: i - 1 });
    totalDist += dist;
  }

  const speedSafe = Math.max(0.5, speed);
  const duration = Math.min(3600, totalDist / speedSafe);
  const n = Math.max(2, Math.ceil(duration / dt));

  const t = new Array(n);
  const lat = new Array(n);
  const lon = new Array(n);
  const alt = new Array(n);
  const roll = new Array(n).fill(0);
  const pitch = new Array(n).fill(0);
  const yaw = new Array(n).fill(0);

  const targetAlt = allowClimb ? Math.max(altMin, Math.min(altMax, startAlt)) : altMin;
  const climbEndTime = duration * climbFraction;

  let legIdx = 0;
  let distIntoLeg = 0;

  for (let i = 0; i < n; i++) {
    const time = i * dt;
    t[i] = time;
    const distTravelled = Math.min(totalDist, speedSafe * time);

    while (legIdx < legs.length - 1 && distTravelled > cumulativeDist(legs, legIdx + 1)) {
      legIdx++;
    }
    const legStartDist = cumulativeDist(legs, legIdx);
    const leg = legs[legIdx] || legs[legs.length - 1] || { dist: 1, heading: 0, fromIdx: 0 };
    distIntoLeg = distTravelled - legStartDist;
    const frac = leg.dist > 0 ? Math.min(1, distIntoLeg / leg.dist) : 1;

    const [startN, startE] = nePoints[leg.fromIdx];
    const [endN, endE] = nePoints[Math.min(leg.fromIdx + 1, nePoints.length - 1)];
    const curN = startN + (endN - startN) * frac;
    const curE = startE + (endE - startE) * frac;
    const [curLat, curLon] = fromNE(curN, curE);
    lat[i] = curLat;
    lon[i] = curLon;

    yaw[i] = leg.heading;
    // brief bank when heading changes leg-to-leg
    const nextLeg = legs[legIdx + 1];
    const turningSoon = nextLeg && leg.dist - distIntoLeg < speedSafe * 8;
    if (nextLeg && turningSoon) {
      const delta = ((((nextLeg.heading - leg.heading + 540) % 360) - 180) / 1);
      roll[i] = Math.max(-25, Math.min(25, delta * 0.5));
    }

    if (allowClimb && time < climbEndTime) {
      alt[i] = startAlt + (targetAlt - startAlt) * (time / Math.max(1e-6, climbEndTime));
      pitch[i] = targetAlt > startAlt ? 5 : targetAlt < startAlt ? -5 : 0;
    } else {
      alt[i] = targetAlt;
      pitch[i] = 0;
    }
    alt[i] = Math.min(altMax, Math.max(altMin, alt[i]));
  }

  return { t, lat, lon, alt, roll, pitch, yaw, n, totalDist, duration };
}

function cumulativeDist(legs, uptoIdx) {
  let d = 0;
  for (let i = 0; i < uptoIdx; i++) d += legs[i].dist;
  return d;
}

// ---------------------------------------------------------------------
// Stage 2: Geomagnetic truth — simplified centered-dipole model.
// NOTE: this is a validated first-order approximation of Earth's field,
// not the full IGRF spherical-harmonic model (IGRF coefficient tables
// only exist as Python/Fortran libraries and can't run live in a
// browser). Magnitude and large-scale N/E/D structure are physically
// correct; local anomalies beyond the dipole term are not captured.
// ---------------------------------------------------------------------
const B0_NT = 30000; // equatorial reference field strength, nT
const DIP_POLE_LAT = 80.7; // deg N, approx geomagnetic north pole (~2025 epoch)
const DIP_POLE_LON = -72.7; // deg

function toRad(d) {
  return (d * Math.PI) / 180;
}

export function computeGeomagTruth(traj) {
  const { lat, lon, alt, n } = traj;
  const B_N = new Array(n);
  const B_E = new Array(n);
  const B_D = new Array(n);

  const latP = toRad(DIP_POLE_LAT);
  const lonP = toRad(DIP_POLE_LON);

  for (let i = 0; i < n; i++) {
    const latR = toRad(lat[i]);
    const lonR = toRad(lon[i]);
    const r = R_EARTH + alt[i];

    const cosTheta =
      Math.sin(latR) * Math.sin(latP) + Math.cos(latR) * Math.cos(latP) * Math.cos(lonR - lonP);
    const theta = Math.acos(Math.min(1, Math.max(-1, cosTheta)));

    const dLon = lonP - lonR;
    const bearing = Math.atan2(
      Math.sin(dLon) * Math.cos(latP),
      Math.cos(latR) * Math.sin(latP) - Math.sin(latR) * Math.cos(latP) * Math.cos(dLon)
    );

    const scale = Math.pow(R_EARTH / r, 3);
    const H = B0_NT * scale * Math.sin(theta);
    const Z = 2 * B0_NT * scale * Math.cos(theta);

    B_N[i] = H * Math.cos(bearing);
    B_E[i] = H * Math.sin(bearing);
    B_D[i] = Z;
  }

  return { B_N, B_E, B_D };
}

// ---------------------------------------------------------------------
// Stage 3: Anomaly injection — smooth correlated random field
// ---------------------------------------------------------------------
function smoothRandomSeries(nSamples, window, gaussian) {
  const raw = new Array(nSamples);
  for (let i = 0; i < nSamples; i++) raw[i] = gaussian(0, 1);

  const w = Math.max(1, Math.floor(window));
  const out = new Array(nSamples).fill(0);
  for (let i = 0; i < nSamples; i++) {
    let sum = 0;
    let count = 0;
    for (let k = -w; k <= w; k++) {
      const idx = i + k;
      if (idx >= 0 && idx < nSamples) {
        sum += raw[idx];
        count++;
      }
    }
    out[i] = sum / count;
  }
  const mean = out.reduce((a, b) => a + b, 0) / nSamples;
  const variance = out.reduce((a, b) => a + (b - mean) ** 2, 0) / nSamples;
  const std = Math.sqrt(variance) || 1;
  return out.map((v) => v / std);
}

export function injectAnomaly(geomag, n, amplitude, correlationLengthS, seed) {
  const rng = mulberry32(seed);
  const gaussian = makeGaussian(rng);
  const half = Math.round(correlationLengthS / 2);

  const anomN = smoothRandomSeries(n, half, gaussian).map((v) => v * amplitude);
  const anomE = smoothRandomSeries(n, half, gaussian).map((v) => v * amplitude);
  const anomD = smoothRandomSeries(n, half, gaussian).map((v) => v * amplitude);

  const B_N = geomag.B_N.map((v, i) => v + anomN[i]);
  const B_E = geomag.B_E.map((v, i) => v + anomE[i]);
  const B_D = geomag.B_D.map((v, i) => v + anomD[i]);
  const B_total = B_N.map((v, i) => Math.sqrt(v * v + B_E[i] * B_E[i] + B_D[i] * B_D[i]));

  return { B_N, B_E, B_D, B_total };
}

// ---------------------------------------------------------------------
// Stage 4: NED -> body frame rotation + local tangent-plane position
// ---------------------------------------------------------------------
function nedToBodyRotationMatrix(rollDeg, pitchDeg, yawDeg) {
  const r = toRad(rollDeg);
  const p = toRad(pitchDeg);
  const y = toRad(yawDeg);
  const cr = Math.cos(r),
    sr = Math.sin(r);
  const cp = Math.cos(p),
    sp = Math.sin(p);
  const cy = Math.cos(y),
    sy = Math.sin(y);

  return [
    [cp * cy, cp * sy, -sp],
    [sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, sr * cp],
    [cr * sp * cy + sr * sy, cr * sp * sy - sr * cy, cr * cp],
  ];
}

function matVec3(R, v) {
  return [
    R[0][0] * v[0] + R[0][1] * v[1] + R[0][2] * v[2],
    R[1][0] * v[0] + R[1][1] * v[1] + R[1][2] * v[2],
    R[2][0] * v[0] + R[2][1] * v[1] + R[2][2] * v[2],
  ];
}

export function rotateToBodyFrame(traj, anomField) {
  const { n, roll, pitch, yaw, lat, lon, alt } = traj;
  const Bx = new Array(n);
  const By = new Array(n);
  const Bz = new Array(n);

  for (let i = 0; i < n; i++) {
    const R = nedToBodyRotationMatrix(roll[i], pitch[i], yaw[i]);
    const [bx, by, bz] = matVec3(R, [anomField.B_N[i], anomField.B_E[i], anomField.B_D[i]]);
    Bx[i] = bx;
    By[i] = by;
    Bz[i] = bz;
  }
  const B_total = Bx.map((v, i) => Math.sqrt(v * v + By[i] * By[i] + Bz[i] * Bz[i]));

  const lat0 = toRad(lat[0]);
  const lon0 = toRad(lon[0]);
  const alt0 = alt[0];
  const Px = new Array(n);
  const Py = new Array(n);
  const Pz = new Array(n);
  for (let i = 0; i < n; i++) {
    Px[i] = (toRad(lat[i]) - lat0) * R_EARTH;
    Py[i] = (toRad(lon[i]) - lon0) * R_EARTH * Math.cos(lat0);
    Pz[i] = -(alt[i] - alt0);
  }

  return { Bx, By, Bz, B_total, Px, Py, Pz, n };
}

// ---------------------------------------------------------------------
// Stage 5: Ensemble geometry — tetrahedral for N=4, Fibonacci sphere
// (deterministic, well-spread, always non-coplanar for N>=3) otherwise
// ---------------------------------------------------------------------
export function buildGeometry(nDiamonds) {
  if (nDiamonds === 4) {
    const raw = [
      [1, 1, 1],
      [1, -1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
    ];
    return raw.map(([x, y, z]) => {
      const norm = Math.sqrt(x * x + y * y + z * z);
      return { nx: x / norm, ny: y / norm, nz: z / norm };
    });
  }
  const pts = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < nDiamonds; i++) {
    const yv = 1 - (i / (nDiamonds - 1)) * 2;
    const radius = Math.sqrt(1 - yv * yv);
    const theta = goldenAngle * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    pts.push({ nx: x, ny: yv, nz: z });
  }
  return pts;
}

// ---------------------------------------------------------------------
// Stage 6: Per-diamond NV physics — shot noise (Eq.4), drift, bias
// ---------------------------------------------------------------------
const GAMMA_NV_HZ_PER_NT = 28.0;
const R0_COUNTS_PER_S = 500000;
const CONTRAST = 0.3;
const LINEWIDTH_MHZ = 3.0;
const PROFILE_FACTOR = 0.77;
const DRIFT_WALK_STD_NT = 0.05;
const FIXED_BIAS_STD_NT = 5.0;

export function computeNoiseBudget(integrationTimeS) {
  const dvHz = LINEWIDTH_MHZ * 1e6;
  const etaNv = (PROFILE_FACTOR / GAMMA_NV_HZ_PER_NT) * (dvHz / (CONTRAST * Math.sqrt(R0_COUNTS_PER_S)));
  const shotNoiseStdNT = etaNv / Math.sqrt(integrationTimeS);
  return { etaNv, shotNoiseStdNT, integrationTimeS };
}

export function projectAndCorrupt(bodyField, geometry, integrationTimeS, seed) {
  const { n, Bx, By, Bz } = bodyField;
  const { shotNoiseStdNT } = computeNoiseBudget(integrationTimeS);
  const rng = mulberry32(seed);
  const gaussian = makeGaussian(rng);

  const projections = geometry.map(() => new Array(n));

  geometry.forEach((axis, dIdx) => {
    const fixedBias = gaussian(0, FIXED_BIAS_STD_NT);
    let drift = 0;
    for (let i = 0; i < n; i++) {
      const trueProj = Bx[i] * axis.nx + By[i] * axis.ny + Bz[i] * axis.nz;
      drift += gaussian(0, DRIFT_WALK_STD_NT);
      const shotNoise = gaussian(0, shotNoiseStdNT);
      projections[dIdx][i] = trueProj + shotNoise + drift + fixedBias;
    }
  });

  return { projections, shotNoiseStdNT };
}

// ---------------------------------------------------------------------
// Stage 7: Least-squares vector reconstruction (closed-form 3x3 solve)
// ---------------------------------------------------------------------
function invert3x3(M) {
  const [a, b, c] = M[0];
  const [d, e, f] = M[1];
  const [g, h, i] = M[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

export function reconstructVector(projections, geometry, n) {
  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  geometry.forEach((ax) => {
    const v = [ax.nx, ax.ny, ax.nz];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) AtA[r][c] += v[r] * v[c];
  });
  const AtA_inv = invert3x3(AtA);

  const Bx = new Array(n);
  const By = new Array(n);
  const Bz = new Array(n);

  for (let i = 0; i < n; i++) {
    const AtY = [0, 0, 0];
    geometry.forEach((ax, dIdx) => {
      const y = projections[dIdx][i];
      AtY[0] += ax.nx * y;
      AtY[1] += ax.ny * y;
      AtY[2] += ax.nz * y;
    });
    if (AtA_inv) {
      Bx[i] = AtA_inv[0][0] * AtY[0] + AtA_inv[0][1] * AtY[1] + AtA_inv[0][2] * AtY[2];
      By[i] = AtA_inv[1][0] * AtY[0] + AtA_inv[1][1] * AtY[1] + AtA_inv[1][2] * AtY[2];
      Bz[i] = AtA_inv[2][0] * AtY[0] + AtA_inv[2][1] * AtY[1] + AtA_inv[2][2] * AtY[2];
    } else {
      Bx[i] = By[i] = Bz[i] = NaN;
    }
  }
  const B_total = Bx.map((v, i) => Math.sqrt(v * v + By[i] * By[i] + Bz[i] * Bz[i]));
  return { Bx, By, Bz, B_total };
}

// ---------------------------------------------------------------------
// Full pipeline orchestration
// ---------------------------------------------------------------------
export function runFullSimulation(params) {
  const useWaypoints = params.waypoints && params.waypoints.length >= 2;
  const traj = useWaypoints ? generateWaypointTrajectory(params) : generateTrajectory(params);
  const geomag = computeGeomagTruth(traj);
  const anomField = injectAnomaly(
    geomag,
    traj.n,
    params.anomalyAmplitude,
    params.correlationLength,
    params.anomalySeed
  );
  const body = rotateToBodyFrame(traj, anomField);
  const geometry = buildGeometry(params.nDiamonds);
  const { projections, shotNoiseStdNT } = projectAndCorrupt(
    body,
    geometry,
    params.integrationTimeS,
    params.noiseSeed
  );
  const recon = reconstructVector(projections, geometry, traj.n);
  const noiseBudget = computeNoiseBudget(params.integrationTimeS);

  const rows = [];
  for (let i = 0; i < traj.n; i++) {
    const row = {
      time_s: traj.t[i],
      lat_deg: traj.lat[i],
      lon_deg: traj.lon[i],
      alt_m: traj.alt[i],
      Px_m: body.Px[i],
      Py_m: body.Py[i],
      Pz_m: body.Pz[i],
      roll_deg: traj.roll[i],
      pitch_deg: traj.pitch[i],
      yaw_deg: traj.yaw[i],
      Bx_true_nT: body.Bx[i],
      By_true_nT: body.By[i],
      Bz_true_nT: body.Bz[i],
      B_total_true_nT: body.B_total[i],
      Bx_meas_nT: recon.Bx[i],
      By_meas_nT: recon.By[i],
      Bz_meas_nT: recon.Bz[i],
      B_total_meas_nT: recon.B_total[i],
    };
    geometry.forEach((_, dIdx) => {
      row[`B_proj_D${dIdx + 1}_nT`] = projections[dIdx][i];
    });
    rows.push(row);
  }

  return {
    rows,
    geometry,
    noiseBudget,
    n: traj.n,
    trajectoryMeta: {
      useWaypoints,
      duration: traj.duration ?? params.duration,
      totalDist: traj.totalDist ?? null,
    },
  };
}
