import { GitBranch, NotePencil, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import type { ChatMessage } from '../../../sillytavern';
import { useTavern } from '../runtime/useTavern';

export function HistoryDrawer({ open, onClose, focusMessageId }: { open: boolean; onClose: () => void; focusMessageId?: string | null }) {
  const runtime = useTavern();
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState('');
  const messages = runtime.activeChat?.messages ?? [];
  const edit = (message: ChatMessage) => { setEditing(message); setDraft(message.content); };
  const save = async () => { if (!editing || !draft.trim()) return; await runtime.editAndRegenerate(editing.id, draft); setEditing(null); };

  useEffect(() => {
    if (!open || !focusMessageId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`history-message-${focusMessageId}`);
      target?.focus();
      target?.scrollIntoView({ block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusMessageId, messages.length, open]);

  return <><Dialog id="tavern-history-dialog" title="历史记录" open={open} onClose={onClose} eyebrow="SESSION HISTORY / BRANCHABLE"><ol className="tavern-history-list">{messages.map((message, index) => <li id={`history-message-${message.id}`} tabIndex={-1} key={message.id} className={`is-${message.role}${message.id === focusMessageId ? ' is-source-focus' : ''}`}><div className="tavern-history-index"><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true" /></div><article><header><strong>{message.role === 'assistant' ? runtime.activeCharacter?.name ?? '模型' : runtime.activePersona?.name ?? '玩家'}</strong><time>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></header><p>{message.content}</p><div>{message.role === 'user' ? <button id={`history-edit-${message.id}`} type="button" aria-label={`编辑消息：${message.content}`} onClick={() => edit(message)}><NotePencil size={15} aria-hidden />编辑并重生成</button> : null}<button id={`history-branch-${message.id}`} type="button" aria-label={`从第 ${index + 1} 条消息创建分支`} onClick={() => void runtime.branchFromMessage(message.id)}><GitBranch size={15} aria-hidden />创建分支</button><button id={`history-delete-${message.id}`} type="button" aria-label={`删除第 ${index + 1} 条及后续消息`} onClick={() => void runtime.deleteMessagesFrom(message.id)}><Trash size={15} aria-hidden />删除后续</button></div></article></li>)}</ol></Dialog><Dialog id="tavern-history-edit-dialog" title="编辑历史消息" open={Boolean(editing)} onClose={() => setEditing(null)} eyebrow="REWRITE / REGENERATE" footer={<><button className="terminal-button" type="button" onClick={() => setEditing(null)}>取消</button><button id="history-edit-save" className="terminal-button is-primary" type="button" onClick={() => void save()}>保存并重新生成</button></>}><label className="tavern-history-editor" htmlFor="history-edit-content">编辑后的消息内容<textarea id="history-edit-content" rows={7} value={draft} onChange={(event) => setDraft(event.target.value)} /></label></Dialog></>;
}
