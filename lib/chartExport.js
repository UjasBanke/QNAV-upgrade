// Small, dependency-free helpers for exporting an on-screen <svg> (e.g. a
// recharts plot, or the world map) as a downloadable .svg or .png file.

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function prepareClone(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  if (!clone.getAttribute("viewBox") && svg.getBoundingClientRect) {
    const r = svg.getBoundingClientRect();
    clone.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
  }
  // white background so exported files aren't transparent
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);
  return clone;
}

export function downloadSvgFromContainer(containerEl, filename) {
  if (!containerEl) return;
  const svg = containerEl.querySelector("svg");
  if (!svg) return;
  const clone = prepareClone(svg);
  const svgStr = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  triggerDownload(blob, filename);
}

export function downloadPngFromContainer(containerEl, filename, scale = 2) {
  if (!containerEl) return;
  const svg = containerEl.querySelector("svg");
  if (!svg) return;
  const clone = prepareClone(svg);
  const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
  const rect = svg.getBoundingClientRect();
  const width = (vb && vb.width) || rect.width || 800;
  const height = (vb && vb.height) || rect.height || 400;

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (blob) triggerDownload(blob, filename);
    }, "image/png");
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
