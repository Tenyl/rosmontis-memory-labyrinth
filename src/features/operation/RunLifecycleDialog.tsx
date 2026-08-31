import {
  RefreshCw as ArrowClockwise,
  ArrowRight,
  CircleCheck as CheckCircle,
  Play,
  TriangleAlert as WarningDiamond,
} from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { getAvailableModes } from '../../game/run';
import type { ProgressionState, RunMode, RunState } from '../../game/types';

interface RunLifecycleDialogProps {
  run: RunState;
  progression: ProgressionState;
  llmEnabled: boolean;
  currentNodeIsCore: boolean;
  coreStability: number;
  onStart: (seed: string, mode: RunMode, llmEnabled: boolean) => void;
  onReset: () => void;
  onStabilize: () => void;
  onContinueMindsea?: () => void;
}

const MODE_PRESENTATION: Record<RunMode, { name: string; description: string }> = {
  preset: { name: '预设迷宫', description: '完整离线规则与固定事件池。' },
  endless: { name: '本地无尽', description: '通关后由本地种子持续生成迷宫。' },
  novel: { name: '小说剧情', description: '由 LLM 扩写主题迷宫与连续叙事。' },
};

export function RunLifecycleDialog({
  run,
  progression,
  llmEnabled,
  currentNodeIsCore,
  coreStability,
  onStart,
  onReset,
  onStabilize,
  onContinueMindsea,
}: RunLifecycleDialogProps) {
  const availableModes = getAvailableModes(progression, llmEnabled);
  const [seed, setSeed] = useState(run.seed);
  const [mode, setMode] = useState<RunMode>(run.mode);
  const terminal = run.phase === 'victory' || run.phase === 'defeat';
  const victory = run.phase === 'victory';

  const lockReason = (candidate: RunMode) => {
    if (candidate === 'endless' && !progression.firstClear) {
      return '完成一次预设迷宫后解锁本地无尽。';
    }
    if (candidate === 'novel' && !progression.firstClear) {
      return '首次通关并接入 LLM 后解锁小说剧情。';
    }
    if (candidate === 'novel' && !llmEnabled) {
      return '小说剧情需要已保存的 LLM 接口配置。';
    }
    return null;
  };

  return (
    <>
      <section className="run-lifecycle-panel" aria-labelledby="run-lifecycle-title">
        <header>
          <div>
            <span>RUN CONTROL / REPLAYABLE SEED</span>
            <h2 id="run-lifecycle-title">记忆潜入控制</h2>
          </div>
          <strong>{progression.completedRuns} 次已完成</strong>
        </header>

        <div className="run-lifecycle-body">
          <label className="run-seed-field" htmlFor="run-seed-input">
            <span>迷宫种子</span>
            <input
              id="run-seed-input"
              value={seed}
              maxLength={64}
              onChange={(event) => setSeed(event.target.value)}
            />
            <small>相同种子与模式会生成相同拓扑。</small>
          </label>

          <fieldset className="run-mode-options">
            <legend>潜入模式</legend>
            {(['preset', 'endless', 'novel'] as RunMode[]).map((candidate) => {
              const locked = !availableModes.includes(candidate);
              const reason = lockReason(candidate);
              return (
                <label key={candidate} className={locked ? 'is-locked' : ''} htmlFor={`run-mode-${candidate}`}>
                  <input
                    id={`run-mode-${candidate}`}
                    type="radio"
                    name="run-mode"
                    value={candidate}
                    checked={mode === candidate}
                    disabled={locked}
                    onChange={() => setMode(candidate)}
                  />
                  <span>
                    <strong>{MODE_PRESENTATION[candidate].name}</strong>
                    <small>{reason ?? MODE_PRESENTATION[candidate].description}</small>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <div className="run-lifecycle-actions">
            <button
              id="btn-start-new-run"
              className="terminal-button is-primary"
              type="button"
              disabled={!seed.trim() || !availableModes.includes(mode)}
              onClick={() => onStart(seed.trim(), mode, llmEnabled)}
            >
              <Play size={17} aria-hidden />开始新的记忆潜入
            </button>
            {currentNodeIsCore ? (
              <button
                id="btn-stabilize-memory-core"
                className="terminal-button is-secondary"
                type="button"
                disabled={coreStability < 100 || terminal}
                onClick={onStabilize}
                aria-label="稳定记忆核心并尝试逃离"
              >
                <CheckCircle size={17} aria-hidden />稳定核心 {coreStability}/100
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <Dialog
        id="run-terminal-dialog"
        title={victory ? '潜入完成：记忆迷宫已逃离' : '潜入失败：认知链路中断'}
        eyebrow={victory ? 'RUN COMPLETE / MEMORY RECOVERED' : 'RUN FAILED / LINK TERMINATED'}
        open={terminal}
        onClose={() => undefined}
        closeOnEscape={false}
        dismissible={false}
        danger={!victory}
        footer={(
          <div className="run-terminal-actions"><button
            id="btn-restart-preset-run"
            className="terminal-button is-primary"
            type="button"
            onClick={onReset}
          >
            <ArrowClockwise size={17} aria-hidden />重新开始预设迷宫
          </button>{victory && llmEnabled && onContinueMindsea ? <button id="btn-continue-mindsea" className="terminal-button is-secondary" type="button" onClick={onContinueMindsea}>进入无垠心海 <ArrowRight size={17} aria-hidden /></button> : null}</div>
        )}
      >
        <div className={`run-terminal-summary is-${victory ? 'victory' : 'defeat'}`}>
          {victory ? <CheckCircle size={28} aria-hidden /> : <WarningDiamond size={28} aria-hidden />}
          <div>
            <strong>{victory ? '记忆核心已稳定，迷迭香重新建立现实坐标。' : '思维稳定性或过载度越过安全阈值。'}</strong>
            <p>{victory ? '本地无尽模式已解锁。' : '本次碎片与迷宫进度已终止，永久解锁进度不会丢失。'}</p>
          </div>
        </div>
      </Dialog>
    </>
  );
}
