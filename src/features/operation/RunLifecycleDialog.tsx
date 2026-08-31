import {
  RefreshCw as ArrowClockwise,
  ArrowRight,
  CircleCheck as CheckCircle,
  TriangleAlert as WarningDiamond,
} from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import type { RunState } from '../../game/types';

interface RunLifecycleDialogProps {
  run: RunState;
  llmEnabled: boolean;
  onReset: () => void;
  onContinueMindsea?: () => void;
}

export function RunLifecycleDialog({
  run,
  llmEnabled,
  onReset,
  onContinueMindsea,
}: RunLifecycleDialogProps) {
  const terminal = run.phase === 'victory' || run.phase === 'defeat';
  const victory = run.phase === 'victory';

  return (
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
        <div className="run-terminal-actions">
          <button
            id="btn-restart-preset-run"
            className="terminal-button is-primary"
            type="button"
            onClick={onReset}
          >
            <ArrowClockwise size={17} aria-hidden />重新开始预设迷宫
          </button>
          {victory && llmEnabled && onContinueMindsea ? (
            <button
              id="btn-continue-mindsea"
              className="terminal-button is-secondary"
              type="button"
              onClick={onContinueMindsea}
            >
              进入无垠心海 <ArrowRight size={17} aria-hidden />
            </button>
          ) : null}
        </div>
      )}
    >
      <div className={`run-terminal-summary is-${victory ? 'victory' : 'defeat'}`}>
        {victory ? <CheckCircle size={28} aria-hidden /> : <WarningDiamond size={28} aria-hidden />}
        <div>
          <strong>
            {victory
              ? '记忆核心已稳定，迷迭香重新建立现实坐标。'
              : '思维稳定性或过载度越过安全阈值。'}
          </strong>
          <p>
            {victory
              ? '本地无尽模式已解锁。'
              : '本次碎片与迷宫进度已终止，永久解锁进度不会丢失。'}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
