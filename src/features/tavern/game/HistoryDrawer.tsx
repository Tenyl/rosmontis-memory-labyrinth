import {
  GitBranch,
  NotebookPen as NotePencil,
  Trash2 as Trash,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import type { ChatMessage } from '../../../sillytavern';
import { paginateItems, TAVERN_PAGE_SIZE } from '../components/pagination';
import { useTavern } from '../runtime/useTavern';

export function HistoryDrawer({ open, onClose, focusMessageId, chatId }: { open: boolean; onClose: () => void; focusMessageId?: string | null; chatId?: string | null }) {
  const runtime = useTavern();
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState(1);
  const chat = chatId ? runtime.chats.find((item) => item.id === chatId) ?? null : runtime.activeChat;
  const messages = chat?.messages ?? [];
  const paginated = paginateItems(messages, page);
  const edit = (message: ChatMessage) => {
    setEditing(message);
    setDraft(message.content);
  };
  const save = async () => {
    if (!editing || !draft.trim()) return;
    await runtime.editAndRegenerate(editing.id, draft, chat?.id);
    setEditing(null);
  };

  useEffect(() => {
    if (!open) return;
    const focusIndex = focusMessageId ? messages.findIndex((message) => message.id === focusMessageId) : -1;
    setPage(focusIndex >= 0 ? Math.floor(focusIndex / TAVERN_PAGE_SIZE) + 1 : Math.max(1, Math.ceil(messages.length / TAVERN_PAGE_SIZE)));
  }, [focusMessageId, messages, open]);

  useEffect(() => {
    if (!open || !focusMessageId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`history-message-${focusMessageId}`);
      target?.focus();
      target?.scrollIntoView?.({ block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusMessageId, messages.length, open, paginated.page]);

  return <>
    <Dialog id="tavern-history-dialog" title="历史记录" open={open} onClose={onClose} eyebrow="SESSION HISTORY / BRANCHABLE">
      <ol className="tavern-history-list">
        {paginated.items.map((message, visibleIndex) => {
          const index = paginated.start + visibleIndex;
          return (
          <li id={`history-message-${message.id}`} tabIndex={-1} key={message.id} className={`is-${message.role}${message.id === focusMessageId ? ' is-source-focus' : ''}`}>
            <div className="tavern-history-index"><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true" /></div>
            <article>
              <header>
                <strong>{message.role === 'assistant' ? chat?.characterName ?? runtime.activeCharacter?.name ?? '模型' : chat?.userName ?? runtime.activePersona?.name ?? '玩家'}</strong>
                <time>{new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time>
              </header>
              <p>{message.content}</p>
              <div>
                {message.role === 'user' ? <button id={`history-edit-${message.id}`} type="button" aria-label={`编辑消息：${message.content}`} onClick={() => edit(message)}><NotePencil size={15} aria-hidden />编辑并重生成</button> : null}
                <button id={`history-branch-${message.id}`} type="button" aria-label={`从第 ${index + 1} 条消息创建分支`} onClick={() => void runtime.branchFromMessage(message.id, undefined, chat?.id)}><GitBranch size={15} aria-hidden />创建分支</button>
                <button id={`history-delete-${message.id}`} type="button" aria-label={`删除第 ${index + 1} 条及后续消息`} onClick={() => void runtime.deleteMessagesFrom(message.id, chat?.id)}><Trash size={15} aria-hidden />删除后续</button>
              </div>
            </article>
          </li>
          );
        })}
      </ol>
      {paginated.pageCount > 1 ? <nav className="tavern-list-pagination" aria-label="历史消息分页">
        <button id="history-page-previous" type="button" disabled={paginated.page === 1} onClick={() => setPage(paginated.page - 1)}>上一页</button>
        <output id="history-page-status">{paginated.start + 1}–{paginated.end} / {paginated.total} · 第 {paginated.page}/{paginated.pageCount} 页</output>
        <button id="history-page-next" type="button" disabled={paginated.page === paginated.pageCount} onClick={() => setPage(paginated.page + 1)}>下一页</button>
      </nav> : null}
    </Dialog>
    <Dialog
      id="tavern-history-edit-dialog"
      title="编辑历史消息"
      open={Boolean(editing)}
      onClose={() => setEditing(null)}
      eyebrow="REWRITE / REGENERATE"
      footer={<>
        <button id="history-edit-cancel" className="terminal-button" type="button" onClick={() => setEditing(null)}>取消</button>
        <button id="history-edit-save" className="terminal-button is-primary" type="button" onClick={() => void save()}>保存并重新生成</button>
      </>}
    >
      <label className="tavern-history-editor" htmlFor="history-edit-content">编辑后的消息内容
        <textarea id="history-edit-content" rows={7} value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
    </Dialog>
  </>;
}
