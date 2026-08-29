import { Check, GitBranch, NotePencil, Plus, SignIn, Trash, X } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../../../components/Dialog';
import { useTavern } from '../runtime/useTavern';

export function SessionManager() {
  const { chats, activeChat, createChat, selectChat, renameChat, removeChat, branchChat } = useTavern();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  const renameTarget = chats.find((chat) => chat.id === renameId) ?? null;
  const deleteTarget = chats.find((chat) => chat.id === deleteId) ?? null;

  const submitCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!createName.trim()) {
      setError('请输入会话名称');
      return;
    }
    await createChat(createName);
    setCreateName('');
    setError(null);
    setCreateOpen(false);
  };

  const submitRename = async (event: FormEvent) => {
    event.preventDefault();
    if (!renameId || !renameName.trim()) {
      setError('请输入新的会话名称');
      return;
    }
    await renameChat(renameId, renameName);
    setRenameId(null);
    setRenameName('');
    setError(null);
  };

  return (
    <section id="tavern-panel-sessions" className="tavern-panel-stack" role="tabpanel" aria-labelledby="tavern-tab-sessions">
      <header className="tavern-section-heading">
        <div><span className="panel-code">CHAT ARCHIVE / BRANCHABLE</span><h3>会话调度</h3><p>每个会话保存独立的角色、预设、世界书与变量快照。</p></div>
        <button id="tavern-session-create-open" className="terminal-button is-primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} aria-hidden />新建会话</button>
      </header>

      <div className="tavern-session-list" aria-label="会话列表">
        {sortedChats.map((chat) => {
          const active = activeChat?.id === chat.id;
          return (
            <article key={chat.id} className={`tavern-session-card${active ? ' is-active' : ''}`}>
              <button id={`tavern-session-${chat.id}-load`} className="session-load" type="button" onClick={() => void selectChat(chat.id)} aria-current={active ? 'true' : undefined}>
                <span className="session-index">{active ? 'LIVE' : chat.parentChatId ? 'BRANCH' : 'ARCHIVE'}</span>
                <span><strong>{chat.name}</strong><small>{chat.characterName} / {chat.userName}</small></span>
                <span className="session-count"><b>{chat.messages.length}</b><small>MESSAGES</small></span>
              </button>
              <div className="session-actions">
                {!active ? <button id={`tavern-session-${chat.id}-activate`} type="button" aria-label={`载入${chat.name}`} onClick={() => void selectChat(chat.id)}><SignIn size={17} aria-hidden /></button> : null}
                <button id={`tavern-session-${chat.id}-rename`} type="button" aria-label={`重命名${chat.name}`} onClick={() => { setRenameId(chat.id); setRenameName(chat.name); setError(null); }}><NotePencil size={17} aria-hidden /></button>
                <button id={`tavern-session-${chat.id}-branch`} type="button" aria-label={`从${chat.name}的最后消息建立分支`} disabled={chat.messages.length === 0} onClick={() => void branchChat(chat.id)}><GitBranch size={17} aria-hidden /></button>
                <button id={`tavern-session-${chat.id}-delete`} type="button" aria-label={`删除${chat.name}`} disabled={chats.length <= 1} onClick={() => setDeleteId(chat.id)}><Trash size={17} aria-hidden /></button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog id="tavern-session-create-dialog" title="新建会话" open={createOpen} onClose={() => { setCreateOpen(false); setError(null); }} eyebrow="SESSION / CREATE" footer={<><button id="tavern-session-create-cancel" className="terminal-button is-secondary" type="button" onClick={() => setCreateOpen(false)}><X size={16} aria-hidden />取消</button><button id="tavern-session-create-submit" className="terminal-button is-primary" type="submit" form="tavern-session-create-form"><Check size={16} aria-hidden />创建并载入</button></>}>
        <form id="tavern-session-create-form" className="tavern-compact-form" onSubmit={(event) => void submitCreate(event)}>
          <label htmlFor="tavern-session-create-name">会话名称</label>
          <input id="tavern-session-create-name" value={createName} onChange={(event) => { setCreateName(event.target.value); setError(null); }} aria-describedby="tavern-session-create-help" autoFocus />
          <small id="tavern-session-create-help">会使用当前角色、玩家身份、预设与已启用世界书创建独立记录。</small>
          {error ? <p className="tavern-form-error" role="alert">{error}</p> : null}
        </form>
      </Dialog>

      <Dialog id="tavern-session-rename-dialog" title="重命名会话" open={Boolean(renameTarget)} onClose={() => { setRenameId(null); setError(null); }} eyebrow="SESSION / RENAME" footer={<><button id="tavern-session-rename-cancel" className="terminal-button is-secondary" type="button" onClick={() => setRenameId(null)}>取消</button><button id="tavern-session-rename-submit" className="terminal-button is-primary" type="submit" form="tavern-session-rename-form">保存名称</button></>}>
        <form id="tavern-session-rename-form" className="tavern-compact-form" onSubmit={(event) => void submitRename(event)}>
          <label htmlFor="tavern-session-rename-name">新的会话名称</label>
          <input id="tavern-session-rename-name" value={renameName} onChange={(event) => { setRenameName(event.target.value); setError(null); }} />
          {error ? <p className="tavern-form-error" role="alert">{error}</p> : null}
        </form>
      </Dialog>

      <Dialog id="tavern-session-delete-dialog" title="确认删除会话" open={Boolean(deleteTarget)} onClose={() => setDeleteId(null)} danger eyebrow="SESSION / DESTRUCTIVE" footer={<><button id="tavern-session-delete-cancel" className="terminal-button is-secondary" type="button" onClick={() => setDeleteId(null)}>保留会话</button><button id="tavern-session-delete-confirm" className="terminal-button is-danger" type="button" onClick={() => { if (deleteId) void removeChat(deleteId); setDeleteId(null); }}>确认删除</button></>}>
        <div className="tavern-danger-copy"><Trash size={24} aria-hidden /><div><strong>{deleteTarget?.name}</strong><p>该会话的全部消息、变量快照与分支来源将从当前浏览器删除。其他会话和世界书不受影响。</p></div></div>
      </Dialog>
    </section>
  );
}
