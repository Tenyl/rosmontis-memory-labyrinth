interface Segment<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  id: string;
  label: string;
  value: T;
  items: Segment<T>[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ id, label, value, items, onChange }: SegmentedControlProps<T>) {
  return (
    <div id={id} className="segmented-control" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          id={`${id}-${item.value}`}
          key={item.value}
          type="button"
          className={item.value === value ? 'is-selected' : ''}
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          <span>{item.label}</span>
          {item.count !== undefined ? <small>{item.count}</small> : null}
        </button>
      ))}
    </div>
  );
}
