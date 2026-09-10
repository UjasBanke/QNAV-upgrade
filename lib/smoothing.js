// Centered moving-average (boxcar) filter — mirrors the Stage 7b Python
// post-processing step (pandas .rolling(window, center=True, min_periods=1).mean()).
// Raw per-sample shot noise is white/uncorrelated, so the reconstructed
// signal is spiky even after ensemble averaging; this smooths it the same
// way a lock-in amplifier / DAQ moving average would, without touching the
// underlying physics.

export const DEFAULT_SMOOTH_WINDOW = 9; // samples, odd, centered (~9s at 1s spacing)

export function movingAverage(values, window = DEFAULT_SMOOTH_WINDOW) {
  const n = values.length;
  const half = Math.floor(window / 2);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = lo; j <= hi; j++) {
      const v = values[j];
      if (v !== undefined && v !== null && !Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    out[i] = count > 0 ? sum / count : values[i];
  }
  return out;
}

// Adds `${col}_smooth` fields to a shallow copy of each row for the given
// columns, using a centered moving average over the whole series.
export function smoothRows(rows, cols, window = DEFAULT_SMOOTH_WINDOW) {
  if (!rows || rows.length === 0) return rows;
  const smoothedByCol = {};
  for (const col of cols) {
    smoothedByCol[col] = movingAverage(rows.map((r) => r[col]), window);
  }
  return rows.map((r, i) => {
    const next = { ...r };
    for (const col of cols) {
      next[`${col}_smooth`] = smoothedByCol[col][i];
    }
    return next;
  });
}
