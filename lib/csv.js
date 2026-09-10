export function rowsToCsv(rows, nDiamonds) {
  const baseCols = [
    "time_s",
    "lat_deg",
    "lon_deg",
    "alt_m",
    "Px_m",
    "Py_m",
    "Pz_m",
    "roll_deg",
    "pitch_deg",
    "yaw_deg",
    "Bx_true_nT",
    "By_true_nT",
    "Bz_true_nT",
    "B_total_true_nT",
  ];
  const diamondCols = Array.from({ length: nDiamonds }, (_, i) => `B_proj_D${i + 1}_nT`);
  const tailCols = ["Bx_meas_nT", "By_meas_nT", "Bz_meas_nT", "B_total_meas_nT"];
  const cols = [...baseCols, ...diamondCols, ...tailCols];

  const header = cols.join(",");
  const lines = rows.map((row) =>
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

export function downloadCsv(filename, csvString) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
