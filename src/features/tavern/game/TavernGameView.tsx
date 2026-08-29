import { ArrowClockwise, ClockCounterClockwise } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '../../../store/gameStore';
import { CommandConsole } from '../../operation/CommandConsole';
import { useTavern } from '../runtime/useTavern';
import { HistoryDrawer } from './HistoryDrawer';
import { MainTextPane } from './MainTextPane';
import { OptionList } from './OptionList';
import { ThinkingFold } from './ThinkingFold';
import { TurnTelemetry } from './TurnTelemetry';
import './tavern-game.css';

export function TavernGameView() {
  const runtime = useTavern();
  const location = useLocation();
  const narrative = useGameStore((state) => state.narrative);
  const setInputMode = useGameStore((state) => state.setInputMode);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFocusMessageId, setHistoryFocusMessageId] = useState<string | null>(null);
  const handledDeepLink = useRef('');
  const isGenerating = runtime.status === 'assembling' || runtime.status === 'streaming';
  const lastAssistant = useMemo(
    () => [...(runtime.activeChat?.messages ?? [])].reverse().find((message) => message.role === 'assistant') ?? null,
    [runtime.activeChat?.messages],
  );
  const display = isGenerating ? runtime.stream : {
    thinking: lastAssistant?.parsed?.thinking ?? '',
    maintext: lastAssistant?.parsed?.maintext ?? lastAssistant?.content ?? '',
    options: lastAssistant?.parsed?.options ?? [],
    sum: lastAssistant?.parsed?.sum ?? '',
  };
  const suggestions = display.options.length ? display.options : narrative.suggestions;

  useEffect(() => {
    if (!runtime.initialized) return;
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session');
    const messageId = params.get('message');
    const deepLinkKey = `${sessionId ?? ''}:${messageId ?? ''}`;
    if (!sessionId || !messageId || handledDeepLink.current === deepLinkKey) return;
    if (!runtime.chats.some((chat) => chat.id === sessionId)) {
      handledDeepLink.current = deepLinkKey;
      setError('来源会话已被删除或无法访问');
      return;
    }
    if (runtime.activeChat?.id !== sessionId) {
      void runtime.selectChat(sessionId);
      return;
    }
    handledDeepLink.current = deepLinkKey;
    setHistoryFocusMessageId(messageId);
    setHistoryOpen(true);
  }, [location.search, runtime.activeChat?.id, runtime.chats, runtime.initialized, runtime.selectChat]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < display.options.length && index < 9) {
        event.preventDefault();
        setDraft(display.options[index]);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [display.options]);

  const submit = async () => {
    const content = draft.trim();
    if (!content) { setError('请输入行动描述，或从上方选择一项建议'); return; }
    setError(null);
    try {
      await runtime.sendMessage(content);
      setDraft('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '无法提交战术指令');
    }
  };

  return (
    <div className="tavern-game-view">
      <section className="tavern-narrative" aria-labelledby="narrative-stream-title">
        <header className="narrative-stream-header">
          <div><span className="panel-code">NARRATIVE FEED / TAVERN RUNTIME</span><h2 id="narrative-stream-title">剧情文本流</h2></div>
          <button id="tavern-history-open" className="terminal-button" type="button" aria-label={`打开历史记录，共 ${runtime.activeChat?.messages.length ?? 0} 条`} onClick={() => setHistoryOpen(true)}><ClockCounterClockwise size={16} aria-hidden />历史 {String(runtime.activeChat?.messages.length ?? 0).padStart(2, '0')}</button>
        </header>
        <TurnTelemetry status={runtime.status} matches={runtime.matchedEntries} variables={Object.keys(runtime.activeChat?.variables ?? {}).length} />
        <div className="tavern-narrative-body">
          <ThinkingFold text={display.thinking} mode={runtime.settings?.thinkingDisplay ?? 'fold'} />
          <MainTextPane text={display.maintext} isStreaming={isGenerating} sequence={Math.max(1, Math.ceil((runtime.activeChat?.messages.length ?? 1) / 2))} />
          <OptionList options={display.options} disabled={isGenerating} onPick={setDraft} />
          {display.sum ? <details className="tavern-turn-summary"><summary>本回合摘要</summary><p>{display.sum}</p></details> : null}
          {runtime.status === 'interrupted' ? <p className="tavern-runtime-notice is-warning" role="status">生成已中断</p> : null}
          {runtime.error ? <p className="tavern-runtime-notice is-danger" role="alert">{runtime.error}</p> : null}
        </div>
        <footer className="tavern-narrative-footer">
          <span>{runtime.activeCharacter?.name ?? '未选择角色'} / {runtime.activePersona?.name ?? '未选择身份'}</span>
          <button id="tavern-retry-turn" className="terminal-button" type="button" disabled={isGenerating || !runtime.activeChat?.messages.some((message) => message.role === 'user')} aria-label="重试上一轮" onClick={() => void runtime.retryLastTurn()}><ArrowClockwise size={16} aria-hidden />重试上一轮</button>
        </footer>
      </section>
      {runtime.initialized ? <CommandConsole draft={draft} inputMode={narrative.inputMode} suggestions={suggestions} status={runtime.status} transportMode={runtime.transportMode} error={error} onDraftChange={(value) => { setDraft(value); setError(null); }} onModeChange={setInputMode} onSubmit={() => void submit()} onStop={runtime.stopGeneration} /> : <div className="tavern-runtime-notice" role="status">正在恢复酒馆运行时与本地会话。</div>}
      <HistoryDrawer open={historyOpen} focusMessageId={historyFocusMessageId} onClose={() => { setHistoryOpen(false); setHistoryFocusMessageId(null); }} />
    </div>
  );
}
