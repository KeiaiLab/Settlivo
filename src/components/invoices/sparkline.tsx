export function Sparkline({ values, width = 160, height = 36, label }: { values: number[]; width?: number; height?: number; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * (height - 4) - 2}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="overflow-visible">
      <title>{label}</title>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400" points={pts.join(" ")} />
    </svg>
  );
}
