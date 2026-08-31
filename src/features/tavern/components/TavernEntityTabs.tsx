import {
  Library as Books,
  PanelsTopLeft as CardsThree,
  MessagesSquare as ChatsCircle,
  SlidersHorizontal,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type TavernTab = 'sessions' | 'lorebooks' | 'presets' | 'variables';

interface TavernEntityTabsProps {
  active: TavernTab;
  onChange: (tab: TavernTab) => void;
  counts: Record<TavernTab, number>;
}

const tabs: Array<{ id: TavernTab; label: string; caption: string; icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }> = [
  { id: 'sessions', label: '会话', caption: 'SESSIONS', icon: ChatsCircle },
  { id: 'lorebooks', label: '世界书', caption: 'LOREBOOKS', icon: Books },
  { id: 'presets', label: '预设', caption: 'PRESETS', icon: SlidersHorizontal },
  { id: 'variables', label: '变量', caption: 'VARIABLES', icon: CardsThree },
];

export function TavernEntityTabs({ active, onChange, counts }: TavernEntityTabsProps) {
  return (
    <div className="tavern-entity-tabs" role="tablist" aria-label="酒馆编排模块">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            id={`tavern-tab-${tab.id}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`tavern-panel-${tab.id}`}
            className={active === tab.id ? 'is-active' : ''}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={19} aria-hidden />
            <span><strong>{tab.label}</strong><small>{tab.caption}</small></span>
            <i>{String(counts[tab.id]).padStart(2, '0')}</i>
          </button>
        );
      })}
    </div>
  );
}
