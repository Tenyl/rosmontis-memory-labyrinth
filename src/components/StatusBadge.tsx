import { CheckCircle, Question, WarningDiamond } from '@phosphor-icons/react';

interface StatusBadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'memory';
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const Icon = tone === 'success' ? CheckCircle : tone === 'neutral' ? Question : WarningDiamond;
  return (
    <span className={`status-badge is-${tone}`}>
      <Icon size={14} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
