import {
  ArrowRight,
  Command,
  Keyboard,
} from 'lucide-react';
import { Dialog } from './Dialog';

interface ShortcutDialogProps { open: boolean; onClose: () => void; }

const shortcuts = [
  { keys: ['?'], label: '打开快捷键说明', scope: '全局' },
  { keys: ['/'], label: '聚焦战术指令', scope: '全局' },
  { keys: ['Ctrl', 'Enter'], label: '发送当前指令', scope: '作战主控台' },
  { keys: ['Esc'], label: '关闭当前弹层', scope: '弹层' },
  { keys: ['Tab'], label: '移动至下一交互项', scope: '全局' },
  { keys: ['Shift', 'Tab'], label: '移动至上一交互项', scope: '全局' },
];

export function ShortcutDialog({ open, onClose }: ShortcutDialogProps) {
  return <Dialog id="global-shortcuts-dialog" title="终端快捷键" eyebrow="KEYBOARD ACCESS / REFERENCE" open={open} onClose={onClose} footer={<button id="global-shortcuts-confirm" className="terminal-button is-primary" type="button" onClick={onClose}>返回终端<ArrowRight size={16} aria-hidden /></button>}>
    <div className="shortcut-dialog-content"><div className="shortcut-intro"><Keyboard size={24} aria-hidden /><div><strong>键盘操作已启用</strong><p>所有核心节点、档案卡、设置项与弹层均可通过键盘完成操作。</p></div></div><div className="shortcut-list">{shortcuts.map((shortcut,index) => <div key={shortcut.label}><span>{String(index + 1).padStart(2,'0')}</span><div>{shortcut.keys.map((key) => <kbd key={key}>{key}</kbd>)}</div><strong>{shortcut.label}</strong><small>{shortcut.scope}</small></div>)}</div><div className="shortcut-tip"><Command size={17} aria-hidden /><p>在文字输入框内按“?”或“/”会正常输入字符，不会触发全局快捷键。</p></div></div>
  </Dialog>;
}
