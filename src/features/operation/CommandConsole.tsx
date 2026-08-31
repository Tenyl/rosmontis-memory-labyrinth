import {
  ArrowUpRight,
  Braces as BracketsCurly,
  MessageSquareText as ChatCenteredText,
  Square as Stop,
  Sparkles as Sparkle,
} from 'lucide-react';
import type { InputMode } from '../../types/game';
import type { TavernRuntimeStatus } from '../tavern/runtime/TavernProvider';

interface CommandConsoleProps {
  draft: string;
  inputMode: InputMode;
  suggestions: string[];
  status: TavernRuntimeStatus;
  transportMode: 'local' | 'remote';
  error: string | null;
  onDraftChange: (value: string) => void;
  onModeChange: (mode: InputMode) => void;
  onSubmit: () => void;
  onStop: () => void;
  dataNotice?: string;
}

const inputModes: Array<{ value: InputMode; label: string }> = [
  { value: '行动描述', label: '行动描述' },
  { value: '战术口令', label: '战术口令' },
  { value: '状态询问', label: '状态询问' },
];

const statusLabel: Record<TavernRuntimeStatus, string> = {
  booting: '恢复会话',
  ready: '待命',
  assembling: '编排上下文',
  streaming: '生成中',
  paused: '已暂停',
  interrupted: '已中断',
  complete: '回合完成',
  failed: '链路异常',
};

export function CommandConsole({
  draft,
  inputMode,
  suggestions,
  status,
  transportMode,
  error,
  onDraftChange,
  onModeChange,
  onSubmit,
  onStop,
  dataNotice,
}: CommandConsoleProps) {
  const isGenerating = status === 'assembling' || status === 'streaming';

  return (
    <section className="command-console" aria-labelledby="command-console-title">
      <div className="command-console-heading">
        <div>
          <span className="panel-code">LLM COMMAND CHANNEL / {transportMode === 'local' ? 'LOCAL SIM' : 'REMOTE API'}</span>
          <h2 id="command-console-title">战术指令输入</h2>
        </div>
        <span className={`generation-state is-${status}`} aria-live="polite">
          <i aria-hidden="true" />{statusLabel[status]}
        </span>
      </div>

      <div className="command-suggestions" aria-label="建议行动">
        {suggestions.map((suggestion, index) => (
          <button
            id={`operation-suggestion-${index + 1}`}
            key={suggestion}
            type="button"
            onClick={() => onDraftChange(suggestion)}
          >
            <Sparkle size={14} aria-hidden />
            {suggestion}
          </button>
        ))}
      </div>

      <div className="command-mode-tabs" role="tablist" aria-label="指令输入模式">
        {inputModes.map((mode, index) => (
          <button
            id={`operation-input-mode-${index + 1}`}
            key={mode.value}
            type="button"
            role="tab"
            aria-selected={inputMode === mode.value}
            className={inputMode === mode.value ? 'is-active' : ''}
            onClick={() => onModeChange(mode.value)}
          >
            {mode.value === '战术口令' ? <BracketsCurly size={15} aria-hidden /> : <ChatCenteredText size={15} aria-hidden />}
            {mode.label}
          </button>
        ))}
      </div>

      <div className={`command-entry${error ? ' has-error' : ''}`}>
        <label htmlFor="operation-command-input">
          <span>{inputMode}</span>
          <small>{dataNotice ?? (transportMode === 'remote' ? '内容会发送至当前配置的远程模型' : '内容仅由本地规则处理')}</small>
        </label>
        <textarea
          id="operation-command-input"
          aria-label="战术指令"
          value={draft}
          rows={4}
          disabled={isGenerating}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'operation-command-error' : 'operation-command-hint'}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
        <div className="command-entry-footer">
          <p id={error ? 'operation-command-error' : 'operation-command-hint'} role={error ? 'alert' : undefined}>
            {error ?? 'Ctrl / Cmd + Enter 快速发送 · 本回合将自动写入行动记录'}
          </p>
          <div className="command-actions">
            {isGenerating ? (
              <button id="operation-generation-stop" className="terminal-button is-secondary" type="button" onClick={onStop}>
                <Stop size={16} aria-hidden />停止生成
              </button>
            ) : null}
            <button
              id="operation-command-submit"
              className="terminal-button is-primary"
              type="button"
              disabled={isGenerating}
              onClick={onSubmit}
            >
              发送战术指令<ArrowUpRight size={17} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
