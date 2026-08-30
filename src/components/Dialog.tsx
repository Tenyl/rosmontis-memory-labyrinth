import { X } from '@phosphor-icons/react';
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

interface DialogProps {
  id: string;
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  eyebrow?: string;
  danger?: boolean;
  closeOnEscape?: boolean;
  dismissible?: boolean;
}

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Dialog({
  id,
  title,
  open,
  onClose,
  children,
  footer,
  eyebrow = 'RHODES / SECURE WINDOW',
  danger = false,
  dismissible = true,
  closeOnEscape = dismissible,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    titleRef.current?.focus();

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      const trigger = triggerRef.current;
      window.queueMicrotask(() => {
        if (trigger?.isConnected) trigger.focus();
      });
    };
  }, [closeOnEscape, open]);

  if (!open) return null;

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)];
    if (focusable.length === 0) {
      event.preventDefault();
      titleRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={`dialog-layer${danger ? ' is-danger' : ''}`}>
      <div className="dialog-scrim" aria-hidden="true" />
      <div
        id={id}
        ref={dialogRef}
        className="terminal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={keepFocusInside}
      >
        <header className="dialog-header">
          <div>
            <span className="dialog-eyebrow">{eyebrow}</span>
            <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1}>{title}</h2>
          </div>
          {dismissible ? (
            <button id={`${id}-close`} className="dialog-close" type="button" onClick={onClose} aria-label={`关闭${title}`}>
              <X size={20} aria-hidden />
            </button>
          ) : null}
        </header>
        <div className="dialog-body">{children}</div>
        {footer ? <footer className="dialog-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
