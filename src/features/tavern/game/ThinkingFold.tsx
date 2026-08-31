import {
  Brain,
  ChevronDown as CaretDown,
} from 'lucide-react';
import { useState } from 'react';

export function ThinkingFold({ text, mode }: { text: string; mode: 'fold' | 'hide' | 'inline' }) {
  const [open, setOpen] = useState(false);
  if (!text || mode === 'hide') return null;
  if (mode === 'inline') return <aside className="tavern-thinking is-inline"><Brain size={17} aria-hidden /><p>{text}</p></aside>;
  return <aside className="tavern-thinking"><button id="tavern-thinking-toggle" type="button" aria-expanded={open} aria-controls="tavern-thinking-content" aria-label={`${open ? '收起' : '展开'}思考过程`} onClick={() => setOpen((current) => !current)}><Brain size={17} aria-hidden /><span>模型思考过程</span><small>{text.length} CHARS / PRIVATE TRACE</small><CaretDown size={15} aria-hidden /></button>{open ? <p id="tavern-thinking-content">{text}</p> : null}</aside>;
}
