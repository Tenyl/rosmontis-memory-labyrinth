import {
  ArrowUpRight,
  BracketsCurly,
  ChatCenteredText,
  Pause,
  Play,
  Sparkle,
} from '@phosphor-icons/react';
import type { GenerationStatus, InputMode } from '../../types/game';

interface CommandConsoleProps {
  draft: string;
  inputMode: InputMode;
  suggestions: string[];
  status: GenerationStatus;
  error: string | null;
  onDraftChange: (value: string) => void;
  onModeChange: (mode: InputMode) => void;
  onSubmit: () => void;
  onPause: () => void;
  onResume: () => void;
}

const inputModes: Array<{ value: InputMode; label: string }> = [
  { value: '行动描述', label: '行动描述' },
  { value: '战术口令', label: '战术口令' },
  { value: '询问队员', label: '询问队员' },
];

const statusLabel: Record<GenerationStatus, string> = {
  idle: '待命',
  parsing: '解析意图',
  streaming: '生成中',
  paused: '已暂停',
  interrupted: '已中断',
  complete: '回合完成',
};

export function CommandConsole({
  draft,
  inputMode,
  suggestions,
  status,
  error,
  onDraftChange,
  onModeChange,
  onSubmit,
  onPause,
  onResume,
}: CommandConsoleProps) {
  const isGenerating = status === 'parsing' || status === 'streaming';
  const isPaused = status === 'paused';

  return (
    <section className="command-console" aria-labelledby="command-console-title">
      <div className="command-console-heading">
        <div>
          <span className="panel-code">LLM COMMAND CHANNEL / LOCAL</span>
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
            <Sparkle size={14} weight="fill" aria-hidden />
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
          <small>支持自然语言，不会向外部服务发送数据</small>
        </label>
        <textarea
          id="operation-command-input"
          value={draft}
          rows={4}
          disabled={isGenerating || isPaused}
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
              <button id="operation-generation-pause" className="terminal-button is-secondary" type="button" onClick={onPause}>
                <Pause size={16} weight="fill" aria-hidden />暂停生成
              </button>
            ) : null}
            {isPaused ? (
              <button id="operation-generation-resume" className="terminal-button is-secondary" type="button" onClick={onResume}>
                <Play size={16} weight="fill" aria-hidden />继续生成
              </button>
            ) : null}
            <button
              id="operation-command-submit"
              className="terminal-button is-primary"
              type="button"
              disabled={isGenerating || isPaused}
              onClick={onSubmit}
            >
              发送指令<ArrowUpRight size={17} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
