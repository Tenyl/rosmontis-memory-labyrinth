import type { ReactNode } from 'react';

interface Segment<T extends string> {
  value: T;
  label: string;
  count?: number;
  panelId?: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  id: string;
  label: string;
  value: T;
  items: Segment<T>[];
  onChange: (value: T) => void;
  mode?: 'group' | 'tabs';
}

export function SegmentedControl<T extends string>({ id, label, value, items, onChange, mode = 'group' }: SegmentedControlProps<T>) {
  const tabs = mode === 'tabs';
  return (
    <div id={id} className="segmented-control" role={tabs ? 'tablist' : 'group'} aria-label={label}>
      {items.map((item) => (
        <button
          id={`${id}-${item.value}`}
          key={item.value}
          type="button"
          role={tabs ? 'tab' : undefined}
          className={item.value === value ? 'is-selected' : ''}
          aria-pressed={tabs ? undefined : item.value === value}
          aria-selected={tabs ? item.value === value : undefined}
          aria-controls={tabs ? item.panelId : undefined}
          onClick={() => onChange(item.value)}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.count !== undefined ? <small>{item.count}</small> : null}
        </button>
      ))}
    </div>
  );
}
