// Upsamples a 1s-spaced simulation run to a finer, millisecond-resolution
// time base via linear interpolation between adjacent samples. Every
// numeric column is interpolated; non-numeric columns hold the value of
// the nearest earlier sample.

export const MS_INTERVAL_PRESETS = [
  { label: "1 ms (1000 Hz)", ms: 1 },
  { label: "5 ms (200 Hz)", ms: 5 },
  { label: "10 ms (100 Hz)", ms: 10 },
  { label: "20 ms (50 Hz)", ms: 20 },
  { label: "50 ms (20 Hz)", ms: 50 },
];

export function interpolateToMs(rows, intervalMs = 10) {
  if (!rows || rows.length < 2) return rows || [];

  const cols = Object.keys(rows[0]);
  const numericCols = cols.filter((c) => typeof rows[0][c] === "number");
  const nonNumericCols = cols.filter((c) => !numericCols.includes(c));

  const t0 = rows[0].time_s;
  const t1 = rows[rows.length - 1].time_s;
  const stepS = intervalMs / 1000;
  const nOut = Math.floor((t1 - t0) / stepS) + 1;

  const out = new Array(nOut);
  let srcIdx = 0;

  for (let k = 0; k < nOut; k++) {
    const t = t0 + k * stepS;
    while (srcIdx < rows.length - 2 && rows[srcIdx + 1].time_s < t) srcIdx++;

    const rowA = rows[srcIdx];
    const rowB = rows[Math.min(srcIdx + 1, rows.length - 1)];
    const span = rowB.time_s - rowA.time_s;
    const frac = span > 0 ? (t - rowA.time_s) / span : 0;

    const row = {};
    for (const c of numericCols) {
      const a = rowA[c];
      const b = rowB[c];
      row[c] = a + (b - a) * frac;
    }
    for (const c of nonNumericCols) {
      row[c] = rowA[c];
    }
    row.time_s = t;
    row.time_ms = Math.round(t * 1000);
    out[k] = row;
  }

  return out;
}
