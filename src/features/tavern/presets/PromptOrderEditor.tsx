import { ArrowDown, ArrowUp, Power } from '@phosphor-icons/react';
import { movePromptItem } from '../../../sillytavern';

export interface PromptOrderItem {
  identifier: string;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
  enabled?: boolean;
}

export function PromptOrderEditor({ value, onChange }: { value: PromptOrderItem[]; onChange: (next: PromptOrderItem[]) => void }) {
  const toggle = (index: number) => { const next = value.slice(); next[index] = { ...next[index], enabled: next[index].enabled === false }; onChange(next); };
  const move = (from: number, to: number) => onChange(movePromptItem(value, from, to));
  if (!value.length) return <div className="tavern-empty-state">当前预设没有提示词顺序。导入标准预设或创建默认预设后即可编排。</div>;
  return <ol className="tavern-prompt-order" aria-label="提示词注入顺序">{value.map((item, index) => <li key={`${item.identifier}-${index}`} data-identifier={item.identifier} aria-label={`${item.name ?? item.identifier} 提示词块`} className={item.enabled === false ? 'is-disabled' : ''}><span className="tavern-order-index">{String(index + 1).padStart(2, '0')}</span><button id={`prompt-toggle-${item.identifier}`} className="tavern-order-power" type="button" aria-label={`${item.enabled === false ? '启用' : '停用'} ${item.name ?? item.identifier}`} aria-pressed={item.enabled !== false} onClick={() => toggle(index)}><Power size={16} aria-hidden /></button><div><strong>{item.name ?? item.identifier}</strong><code>{item.identifier} / {item.role ?? 'system'}</code></div><button id={`prompt-up-${item.identifier}`} type="button" disabled={index === 0} aria-label={`上移 ${item.name ?? item.identifier}`} onClick={() => move(index, index - 1)}><ArrowUp size={16} aria-hidden /></button><button id={`prompt-down-${item.identifier}`} type="button" disabled={index === value.length - 1} aria-label={`下移 ${item.name ?? item.identifier}`} onClick={() => move(index, index + 1)}><ArrowDown size={16} aria-hidden /></button></li>)}</ol>;
}
