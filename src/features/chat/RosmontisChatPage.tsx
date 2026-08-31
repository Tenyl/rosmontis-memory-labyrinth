import {
  GitBranch,
  History,
  MessageCircleMore,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Square,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { resolveImageAsset } from '../../assets/assetRegistry';
import { Dialog } from '../../components/Dialog';
import { DEFAULT_CHARACTER_ID } from '../../sillytavern/default-content';
import { HistoryDrawer } from '../tavern/game/HistoryDrawer';
import { MainTextPane } from '../tavern/game/MainTextPane';
import '../tavern/game/tavern-game.css';
import { useTavern } from '../tavern/runtime/useTavern';
import './rosmontis-chat.css';

export default function RosmontisChatPage() {
  const runtime = useTavern();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const chats = useMemo(
    () => runtime.chats
      .filter((chat) => chat.purpose === 'character-chat')
      .sort((left, right) => right.updatedAt - left.updatedAt),
    [runtime.chats],
  );
  const chat = chats.find((item) => item.id === selectedChatId) ?? chats[0] ?? null;
  const configuredCharacter = runtime.activeCharacter
    ?? runtime.characters.find((item) => item.id === DEFAULT_CHARACTER_ID)
    ?? runtime.characters.find((item) => item.name === '迷迭香')
    ?? null;
  const character = runtime.characters.find((item) => item.id === chat?.characterId)
    ?? configuredCharacter;
  const remotelyReady = runtime.initialized
    && runtime.transportMode === 'remote'
    && Boolean(runtime.settings?.api.apiKey.trim())
    && Boolean(character);
  const busy = runtime.status === 'assembling' || runtime.status === 'streaming';

  useEffect(() => {
    if (!selectedChatId && chats[0]) setSelectedChatId(chats[0].id);
    if (selectedChatId && !chats.some((item) => item.id === selectedChatId)) {
      setSelectedChatId(chats[0]?.id ?? null);
    }
  }, [chats, selectedChatId]);

  const createConversation = async () => {
    if (!configuredCharacter) throw new Error('没有找到迷迭香角色卡');
    const id = await runtime.createChat(`迷迭香对话 ${chats.length + 1}`, {
      purpose: 'character-chat',
      runId: null,
      activate: false,
      characterId: configuredCharacter.id,
    });
    setSelectedChatId(id);
    return id;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setLocalError(null);
    setDraft('');
    try {
      const targetChatId = chat?.id ?? await createConversation();
      await runtime.sendMessage(content, targetChatId);
    } catch (error) {
      setDraft(content);
      setLocalError(error instanceof Error ? error.message : '消息发送失败');
    }
  };

  const branch = async () => {
    const source = chat?.messages.at(-1);
    if (!chat || !source) return;
    setLocalError(null);
    try {
      const branchId = await runtime.branchFromMessage(source.id, undefined, chat.id);
      setSelectedChatId(branchId);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : '分支创建失败');
    }
  };

  const openRename = () => {
    if (!chat) return;
    setRenameDraft(chat.name);
    setLocalError(null);
    setRenameOpen(true);
  };

  const saveName = async () => {
    const name = renameDraft.trim();
    if (!chat || !name) {
      setLocalError('请输入对话名称');
      return;
    }
    await runtime.renameChat(chat.id, name);
    setRenameOpen(false);
  };

  const removeConversation = async () => {
    if (!chat) return;
    await runtime.removeChat(chat.id);
    setDeleteOpen(false);
  };

  if (!runtime.initialized) {
    return <section className="rosmontis-chat-loading" role="status">正在读取角色卡与会话记录</section>;
  }

  return (
    <>
    <section id="rosmontis-character-chat-page" className="rosmontis-chat-page">
      <header className="rosmontis-chat-hero">
        <div>
          <span>PRIVATE NEURAL LINK / CHARACTER CHAT</span>
          <h1>迷迭香对话</h1>
          <p>独立于迷宫 Run 的私人通讯。角色卡、人格、预设与世界书会参与上下文组装，但聊天结果不会改写战斗数值或探索进度。</p>
        </div>
        <div className="rosmontis-chat-signal" data-ready={remotelyReady}>
          <i aria-hidden="true" />
          <span>{remotelyReady ? '远程神经链路已连接' : '远程神经链路未连接'}</span>
        </div>
      </header>

      {!remotelyReady ? (
        <article className="rosmontis-chat-offline" aria-labelledby="chat-offline-title">
          <WifiOff size={32} aria-hidden />
          <div>
            <span>REMOTE CHANNEL REQUIRED</span>
            <h2 id="chat-offline-title">接入 LLM 后才会开放角色对话</h2>
            <p>离线玩法仍可完整游玩；这里不会显示伪对话框或本地模拟回复。完成接口配置后，迷迭香会依据当前角色卡与酒馆资料回应。</p>
          </div>
          <Link id="chat-open-api-settings" className="terminal-button is-primary" to="/settings">前往接口设置</Link>
        </article>
      ) : (
        <div className="rosmontis-chat-console">
          <aside className="rosmontis-chat-profile" aria-label="当前对话配置">
            <div className="rosmontis-chat-avatar" aria-label="迷迭香头像占位图">
              <img src={resolveImageAsset('rosmontisPortrait')} alt="迷迭香头像占位图" />
            </div>
            <span>ACTIVE CHARACTER</span>
            <strong>{character?.name ?? '迷迭香'}</strong>
            <p>{character?.personality ?? '角色卡载入中'}</p>
            <dl>
              <div><dt>身份</dt><dd>{runtime.activePersona?.name ?? '博士'}</dd></div>
              <div><dt>预设</dt><dd>{runtime.activePreset?.name ?? '默认预设'}</dd></div>
              <div><dt>世界书</dt><dd>{runtime.settings?.activeLorebookIds.length ?? 0}</dd></div>
            </dl>
          </aside>

          <main className="rosmontis-chat-thread">
            <header className="rosmontis-chat-toolbar">
              <label htmlFor="character-chat-session">对话分支
                <select
                  id="character-chat-session"
                  value={chat?.id ?? ''}
                  onChange={(event) => setSelectedChatId(event.target.value || null)}
                >
                  {!chat ? <option value="">尚未建立对话</option> : null}
                  {chats.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
              </label>
              <div>
                <button id="character-chat-new" type="button" onClick={() => void createConversation()}><Plus size={16} aria-hidden />新对话</button>
                <button id="character-chat-history" type="button" disabled={!chat} onClick={() => setHistoryOpen(true)}><History size={16} aria-hidden />历史</button>
                <button id="character-chat-retry" type="button" disabled={!chat?.messages.some((message) => message.role === 'user') || busy} onClick={() => void runtime.retryLastTurn(chat?.id)}><RefreshCw size={16} aria-hidden />重试</button>
                <button id="character-chat-branch" type="button" aria-label="从当前回复创建分支" disabled={!chat?.messages.length || busy} onClick={() => void branch()}><GitBranch size={16} aria-hidden />分支</button>
                <button id="character-chat-rename" type="button" aria-label="重命名当前对话" disabled={!chat || busy} onClick={openRename}><Pencil size={16} aria-hidden />重命名</button>
                <button id="character-chat-delete" type="button" aria-label="删除当前对话" disabled={!chat || busy} onClick={() => setDeleteOpen(true)}><Trash2 size={16} aria-hidden />删除</button>
              </div>
            </header>

            <div id="character-chat-message-stream" className="rosmontis-chat-messages" aria-live="polite">
              {!chat?.messages.length && !busy ? (
                <article className="rosmontis-chat-greeting">
                  <MessageCircleMore size={24} aria-hidden />
                  <span>{character?.firstMessage ?? '博士，链接已经稳定。'}</span>
                </article>
              ) : null}
              {chat?.messages.map((message, index) => message.role === 'assistant' ? (
                <MainTextPane key={message.id} text={message.content} isStreaming={false} sequence={index + 1} />
              ) : message.role === 'user' ? (
                <article className="rosmontis-chat-user-message" key={message.id}>
                  <span>{chat.userName}</span>
                  <p>{message.content}</p>
                </article>
              ) : null)}
              {busy ? <MainTextPane text={runtime.stream.maintext} isStreaming sequence={(chat?.messages.length ?? 0) + 1} /> : null}
            </div>

            {(localError || runtime.error) ? <p className="rosmontis-chat-error" role="alert">{localError ?? runtime.error}</p> : null}
            <form className="rosmontis-chat-composer" onSubmit={(event) => void submit(event)}>
              <label htmlFor="character-chat-input">发送给迷迭香</label>
              <textarea
                id="character-chat-input"
                rows={3}
                value={draft}
                disabled={busy}
                placeholder="和迷迭香说些什么……"
                onChange={(event) => setDraft(event.target.value)}
              />
              {busy ? (
                <button id="character-chat-stop" type="button" aria-label="停止生成" onClick={runtime.stopGeneration}><Square size={18} aria-hidden />停止</button>
              ) : (
                <button id="character-chat-send" type="submit" aria-label="发送消息" disabled={!draft.trim()}><Send size={18} aria-hidden />发送</button>
              )}
            </form>
          </main>
        </div>
      )}

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} chatId={chat?.id} />
    </section>
    <Dialog
      id="character-chat-rename-dialog"
      title="重命名对话"
      eyebrow="CHARACTER CHAT / LOCAL SESSION"
      open={renameOpen}
      onClose={() => setRenameOpen(false)}
      footer={<><button id="character-chat-rename-cancel" className="terminal-button" type="button" onClick={() => setRenameOpen(false)}>取消</button><button id="character-chat-rename-confirm" className="terminal-button is-primary" type="button" onClick={() => void saveName()}>保存名称</button></>}
    >
      <label className="rosmontis-chat-dialog-field" htmlFor="character-chat-rename-input">
        对话名称
        <input id="character-chat-rename-input" value={renameDraft} onChange={(event) => { setRenameDraft(event.target.value); setLocalError(null); }} />
      </label>
      {localError === '请输入对话名称' ? <p className="rosmontis-chat-dialog-error" role="alert">{localError}</p> : null}
    </Dialog>
    <Dialog
      id="character-chat-delete-dialog"
      title="删除对话"
      eyebrow="CHARACTER CHAT / DESTRUCTIVE"
      open={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      danger
      footer={<><button id="character-chat-delete-cancel" className="terminal-button" type="button" onClick={() => setDeleteOpen(false)}>取消</button><button id="character-chat-delete-confirm" className="terminal-button is-danger" type="button" onClick={() => void removeConversation()}>确认删除</button></>}
    >
      <p>将从当前浏览器删除“{chat?.name}”及其消息记录。其他对话和游戏存档不受影响。</p>
    </Dialog>
    </>
  );
}
