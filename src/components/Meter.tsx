interface MeterProps {
  id: string;
  label: string;
  value: number;
  max?: number;
  unit?: string;
  tone?: 'memory' | 'arts' | 'warning' | 'danger';
  status?: string;
}

export function Meter({ id, label, value, max = 100, unit = '%', tone = 'memory', status }: MeterProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div id={id} className={`terminal-meter is-${tone}`} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="meter-heading"><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>
      <div className="meter-track" aria-hidden="true"><i style={{ transform: `scaleX(${percent / 100})` }} /></div>
      {status ? <p>{status}</p> : null}
    </div>
  );
}
