import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningDiamond,
  X,
} from '@phosphor-icons/react';
import { useGameStore } from '../store/gameStore';
import type { NotificationItem } from '../types/game';

interface NotificationCenterProps {
  items?: NotificationItem[];
  onDismiss?: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  warning: WarningDiamond,
  danger: WarningDiamond,
  processing: CircleNotch,
};

const kindLabels = {
  success: '成功',
  warning: '警告',
  danger: '失败',
  processing: '处理中',
};

export function NotificationCenter({ items, onDismiss }: NotificationCenterProps) {
  const storeItems = useGameStore((state) => state.ui.notifications);
  const dismissNotification = useGameStore((state) => state.dismissNotification);
  const activeItems = items ?? storeItems;
  const dismiss = onDismiss ?? dismissNotification;

  return (
    <div className="notification-region" role="status" aria-live="polite" aria-atomic="true">
      {activeItems.map((item) => {
        const Icon = icons[item.kind] ?? Info;
        return (
          <article id={item.id} key={item.id} className={`terminal-notification is-${item.kind}`} aria-label={`${kindLabels[item.kind]}：${item.title}`}>
            <Icon className={item.kind === 'processing' ? 'is-spinning' : ''} size={21} aria-hidden />
            <div className="notification-copy">
              <span className="notification-kind-label">{kindLabels[item.kind]}</span>
              <strong>{item.title}</strong>
              <p>{item.message}</p>
              {item.actionLabel ? (
                <a id={`${item.id}-action`} href={item.actionTarget ?? '#'}>{item.actionLabel}</a>
              ) : null}
            </div>
            {item.dismissible !== false ? (
              <button id={`${item.id}-dismiss`} type="button" onClick={() => dismiss(item.id)} aria-label={`关闭通知：${item.title}`}>
                <X size={17} aria-hidden />
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
