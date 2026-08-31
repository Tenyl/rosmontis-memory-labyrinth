import {
  CircleMinus as MinusCircle,
  Plus,
} from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { clampNumber, type LorebookEntry } from '../../../sillytavern';

const positions: Array<{ value: LorebookEntry['position']; label: string }> = [
  { value: 'before_char', label: '角色描述之前' }, { value: 'after_char', label: '角色描述之后' },
  { value: 'before_example', label: '对话示例之前' }, { value: 'after_example', label: '对话示例之后' },
  { value: 'at_depth', label: '指定上下文深度' }, { value: 'example_msg_top', label: '示例消息顶部' },
  { value: 'example_msg_bottom', label: '示例消息底部' }, { value: 'outlet', label: '命名出口' },
];

export function EntryForm({ value, onChange }: { value: LorebookEntry; onChange: (patch: Partial<LorebookEntry>) => void }) {
  return <div className="tavern-entry-form">
    <ChipInput id={`entry-${value.id}-keys`} label="主要关键词" value={value.keys} onChange={(keys) => onChange({ keys })} />
    <ChipInput id={`entry-${value.id}-secondary`} label="次级关键词" value={value.secondaryKeys} onChange={(secondaryKeys) => onChange({ secondaryKeys })} />
    <label htmlFor={`entry-${value.id}-comment`}>条目备注<input id={`entry-${value.id}-comment`} value={value.comment ?? ''} onChange={(event) => onChange({ comment: event.target.value })} /></label>
    <label htmlFor={`entry-${value.id}-content`}>注入内容<textarea id={`entry-${value.id}-content`} rows={10} value={value.content} onChange={(event) => onChange({ content: event.target.value })} /></label>
    <div className="tavern-editor-grid">
      <label htmlFor={`entry-${value.id}-position`}>注入位置<select id={`entry-${value.id}-position`} value={value.position} onChange={(event) => onChange({ position: event.target.value as LorebookEntry['position'] })}>{positions.map((position) => <option key={position.value} value={position.value}>{position.label}</option>)}</select></label>
      <label htmlFor={`entry-${value.id}-order`}>优先级<input id={`entry-${value.id}-order`} type="number" value={value.order} onChange={(event) => onChange({ order: clampNumber(event.target.value, 0, 9999, 100) })} /></label>
      {value.position === 'at_depth' ? <label htmlFor={`entry-${value.id}-depth`}>上下文深度<input id={`entry-${value.id}-depth`} type="number" value={value.depth ?? 4} onChange={(event) => onChange({ depth: clampNumber(event.target.value, 0, 999, 4) })} /></label> : null}
      <label htmlFor={`entry-${value.id}-probability`}>触发概率<input id={`entry-${value.id}-probability`} type="number" min="0" max="100" value={value.probability} onChange={(event) => onChange({ probability: clampNumber(event.target.value, 0, 100, 100), useProbability: true })} /></label>
    </div>
    <div className="tavern-toggle-grid"><Toggle id={`entry-${value.id}-constant`} label="常驻条目" checked={value.constant} onChange={(constant) => onChange({ constant })} /><Toggle id={`entry-${value.id}-selective`} label="启用次级筛选" checked={value.selective} onChange={(selective) => onChange({ selective })} /><Toggle id={`entry-${value.id}-case`} label="区分大小写" checked={value.caseSensitive ?? false} onChange={(caseSensitive) => onChange({ caseSensitive })} /><Toggle id={`entry-${value.id}-whole`} label="全词匹配" checked={value.matchWholeWords ?? false} onChange={(matchWholeWords) => onChange({ matchWholeWords })} /><Toggle id={`entry-${value.id}-recursion`} label="阻止递归" checked={value.preventRecursion ?? false} onChange={(preventRecursion) => onChange({ preventRecursion })} /></div>
    {value.selective ? <label htmlFor={`entry-${value.id}-logic`}>次级匹配逻辑<select id={`entry-${value.id}-logic`} value={value.selectiveLogic} onChange={(event) => onChange({ selectiveLogic: event.target.value as LorebookEntry['selectiveLogic'] })}><option value="and_any">命中任一</option><option value="and_all">命中全部</option><option value="not_any">不得命中任一</option><option value="not_all">不得全部命中</option></select></label> : null}
    <details><summary id={`entry-${value.id}-advanced-toggle`}>高级扫描参数</summary><div className="tavern-editor-grid"><NumberInput id={`entry-${value.id}-scan`} label="扫描深度" value={value.scanDepth ?? 0} onChange={(scanDepth) => onChange({ scanDepth })} /><NumberInput id={`entry-${value.id}-sticky`} label="粘性回合" value={value.sticky ?? 0} onChange={(sticky) => onChange({ sticky })} /><NumberInput id={`entry-${value.id}-cooldown`} label="冷却回合" value={value.cooldown ?? 0} onChange={(cooldown) => onChange({ cooldown })} /><NumberInput id={`entry-${value.id}-delay`} label="延迟回合" value={value.delay ?? 0} onChange={(delay) => onChange({ delay })} /><NumberInput id={`entry-${value.id}-weight`} label="分组权重" value={value.weight ?? 100} onChange={(weight) => onChange({ weight })} /></div><label htmlFor={`entry-${value.id}-group`}>分组名称<input id={`entry-${value.id}-group`} value={value.group ?? ''} onChange={(event) => onChange({ group: event.target.value })} /></label></details>
  </div>;
}

function ChipInput({ id, label, value, onChange }: { id: string; label: string; value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => { const next = draft.trim(); if (next && !value.includes(next)) onChange([...value, next]); setDraft(''); };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(); } };
  return <div className="tavern-chip-field"><label htmlFor={id}>{label}</label><div>{value.map((item, index) => <span key={item}>{item}<button id={`${id}-remove-${index}`} type="button" aria-label={`移除关键词 ${item}`} onClick={() => onChange(value.filter((candidate) => candidate !== item))}><MinusCircle size={14} aria-hidden /></button></span>)}<input id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} onBlur={add} /><button id={`${id}-add`} type="button" aria-label={`添加${label}`} onClick={add}><Plus size={14} aria-hidden /></button></div></div>;
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="tavern-toggle" htmlFor={id}><input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>; }
function NumberInput({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (value: number) => void }) { return <label htmlFor={id}>{label}<input id={id} type="number" value={value} onChange={(event) => onChange(clampNumber(event.target.value, 0, 9999, 0))} /></label>; }
