import {
  ArrowSquareOut,
  DownloadSimple,
  GitBranch,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { exportToJson, type ChatSession } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';

interface SessionNodeProps {
  chat: ChatSession;
  chats: ChatSession[];
  activeChatId?: string;
  onLoad: (chat: ChatSession) => void;
  onRename: (chat: ChatSession) => void;
  onBranch: (chat: ChatSession) => void;
  onExport: (chat: ChatSession) => void;
  onDelete: (chat: ChatSession) => void;
}

export function SessionBranchTree() {
  const runtime = useTavern();
  const addNotification = useGameStore((state) => state.addNotification);
  const [renameTarget, setRenameTarget] = useState<ChatSession | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);
  const [error, setError] = useState('');
  const chatIds = useMemo(() => new Set(runtime.chats.map((chat) => chat.id)), [runtime.chats]);
  const roots = useMemo(
    () => runtime.chats
      .filter((chat) => !chat.parentChatId || !chatIds.has(chat.parentChatId))
      .sort((left, right) => left.createdAt - right.createdAt),
    [chatIds, runtime.chats],
  );

  const notify = (id: string, title: string, message: string) => {
    addNotification({ id, kind: 'success', title, message, dismissible: true });
  };

  const load = async (chat: ChatSession) => {
    await runtime.selectChat(chat.id);
    notify('notification-session-loaded', '会话已载入', `顶部运行状态已切换至“${chat.name}”。`);
  };

  const branch = async (chat: ChatSession) => {
    try {
      const branchId = await runtime.branchChat(chat.id);
      const branchName = runtime.chats.find((item) => item.id === branchId)?.name ?? `${chat.name}的新分支`;
      notify('notification-session-branched', '分支已建立', `已从“${chat.name}”的最新消息建立“${branchName}”。`);
    } catch (branchError) {
      addNotification({
        id: 'notification-session-branch-failed',
        kind: 'danger',
        title: '无法建立分支',
        message: branchError instanceof Error ? branchError.message : '会话分支操作失败。',
        dismissible: true,
      });
    }
  };

  const exportSession = (chat: ChatSession) => {
    exportToJson({ version: 1, kind: 'rhodes-tavern-session', session: chat }, `${safeName(chat.name)}.session.json`);
    notify('notification-session-exported', '会话导出已开始', `正在生成“${chat.name}”的本地 JSON 文件。`);
  };

  const openRename = (chat: ChatSession) => {
    setRenameTarget(chat);
    setRenameDraft(chat.name);
    setError('');
  };

  const saveRename = async () => {
    const name = renameDraft.trim();
    if (!renameTarget || !name) {
      setError('请输入会话名称');
      return;
    }
    await runtime.renameChat(renameTarget.id, name);
    notify('notification-session-renamed', '会话名称已更新', `当前分支标记为“${name}”。`);
    setRenameTarget(null);
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    await runtime.removeChat(deleteTarget.id);
    notify('notification-session-deleted', '会话已删除', `“${name}”已从本地分支图中移除。`);
    setDeleteTarget(null);
  };

  if (!runtime.initialized) {
    return <div className="session-tree-empty" role="status">正在读取本地会话拓扑。</div>;
  }

  return (
    <>
      {roots.length ? (
        <ol className="session-branch-tree" role="tree" aria-label="酒馆会话分支">
          {roots.map((chat) => (
            <SessionNode
              key={chat.id}
              chat={chat}
              chats={runtime.chats}
              activeChatId={runtime.activeChat?.id}
              onLoad={(item) => void load(item)}
              onRename={openRename}
              onBranch={(item) => void branch(item)}
              onExport={exportSession}
              onDelete={setDeleteTarget}
            />
          ))}
        </ol>
      ) : (
        <div className="session-tree-empty">
          <GitBranch size={26} aria-hidden />
          <strong>尚无会话分支</strong>
          <p>先在酒馆编排中建立会话，再从任意历史消息生成时间线分歧。</p>
        </div>
      )}

      <Dialog
        id="session-rename-dialog"
        title="重命名会话"
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        eyebrow="SESSION LABEL / LOCAL"
        footer={(
          <>
            <button className="terminal-button" type="button" onClick={() => setRenameTarget(null)}>取消</button>
            <button id="session-rename-confirm" className="terminal-button is-primary" type="button" onClick={() => void saveRename()}>保存名称</button>
          </>
        )}
      >
        <label className="session-dialog-field" htmlFor="session-rename-input">
          会话名称
          <input id="session-rename-input" value={renameDraft} onChange={(event) => { setRenameDraft(event.target.value); setError(''); }} />
        </label>
        {error ? <p className="session-dialog-error" role="alert">{error}</p> : null}
      </Dialog>

      <Dialog
        id="session-delete-dialog"
        title="删除会话分支"
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        eyebrow="LOCAL SESSION / DESTRUCTIVE"
        danger
        footer={(
          <>
            <button className="terminal-button" type="button" onClick={() => setDeleteTarget(null)}>取消</button>
            <button id="session-delete-confirm" className="terminal-button is-danger" type="button" onClick={() => void remove()}>确认删除</button>
          </>
        )}
      >
        <p>将从当前浏览器删除“{deleteTarget?.name}”的消息与变量快照。其子分支会保留并提升为独立根会话。</p>
      </Dialog>
    </>
  );
}

function SessionNode({ chat, chats, activeChatId, onLoad, onRename, onBranch, onExport, onDelete }: SessionNodeProps) {
  const children = chats
    .filter((item) => item.parentChatId === chat.id)
    .sort((left, right) => left.createdAt - right.createdAt);
  const parent = chat.parentChatId ? chats.find((item) => item.id === chat.parentChatId) : null;
  const sourceIndex = parent?.messages.findIndex((message) => message.id === chat.branchedFromMessageId) ?? -1;
  const messageNumber = sourceIndex + 1;
  const turnNumber = Math.max(1, Math.ceil(messageNumber / 2));
  const active = activeChatId === chat.id;

  return (
    <li role="treeitem" aria-label={chat.name} aria-selected={active} className={active ? 'is-active' : ''}>
      <article className="session-branch-card">
        <span className="session-branch-rail" aria-hidden><i /></span>
        <div className="session-branch-main">
          <header>
            <div>
              <span className="panel-code">{parent ? `消息 ${pad(messageNumber)} / 回合 ${pad(turnNumber)}` : 'ROOT SESSION / ORIGIN'}</span>
              <h3>{chat.name}</h3>
            </div>
            {active ? <strong className="session-active-badge">当前会话</strong> : null}
          </header>
          <dl>
            <div><dt>消息</dt><dd>{pad(chat.messages.length)}</dd></div>
            <div><dt>角色</dt><dd>{chat.characterName || '未绑定'}</dd></div>
            <div><dt>变量</dt><dd>{pad(Object.keys(chat.variables).length)}</dd></div>
            <div><dt>更新时间</dt><dd>{new Date(chat.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</dd></div>
          </dl>
          <div className="session-branch-actions">
            <button id={`session-load-${chat.id}`} type="button" disabled={active} aria-label={`载入会话 ${chat.name}`} onClick={() => onLoad(chat)}><ArrowSquareOut size={15} aria-hidden />{active ? '已载入' : '载入'}</button>
            <button id={`session-rename-${chat.id}`} type="button" aria-label={`重命名会话 ${chat.name}`} onClick={() => onRename(chat)}><PencilSimple size={15} aria-hidden />重命名</button>
            <button id={`session-branch-${chat.id}`} type="button" disabled={!chat.messages.length} aria-label={`从会话 ${chat.name} 建立分支`} onClick={() => onBranch(chat)}><GitBranch size={15} aria-hidden />分支</button>
            <button id={`session-export-${chat.id}`} type="button" aria-label={`导出会话 ${chat.name}`} onClick={() => onExport(chat)}><DownloadSimple size={15} aria-hidden />导出</button>
            <button id={`session-delete-${chat.id}`} type="button" aria-label={`删除会话 ${chat.name}`} onClick={() => onDelete(chat)}><Trash size={15} aria-hidden />删除</button>
          </div>
        </div>
      </article>
      {children.length ? (
        <ol role="group" aria-label={`${chat.name}的子分支`}>
          {children.map((child) => (
            <SessionNode key={child.id} chat={child} chats={chats} activeChatId={activeChatId} onLoad={onLoad} onRename={onRename} onBranch={onBranch} onExport={onExport} onDelete={onDelete} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, '0');
}

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}
