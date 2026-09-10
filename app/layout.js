import "./globals.css";

export const metadata = {
  title: "NV Center Ensemble — Quantum Navigation Dashboard",
  description: "Diamond NV-center magnetometer ensemble: trajectory, geomagnetic truth, and reconstruction quality.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
