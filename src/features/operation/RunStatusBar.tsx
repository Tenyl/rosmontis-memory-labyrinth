import { CharacterArtwork } from '../../components/CharacterArtwork';
import type { GreatswordCombatState, ProgressionState, RunState } from '../../game/types';

interface RunStatusBarProps {
  run: RunState;
  rosmontis: GreatswordCombatState;
  progression: ProgressionState;
}

const RUN_MODE_LABELS: Record<RunState['mode'], string> = {
  preset: '预设迷宫',
  endless: '本地无尽',
  novel: '小说剧情',
};

function getOverloadState(overload: number) {
  if (overload >= 100) return { level: 'critical', label: '链路中断 · 立即终止潜入' };
  if (overload >= 85) return { level: 'danger', label: '神经警告 · 认知撕裂风险' };
  if (overload >= 70) return { level: 'warning', label: '过载警戒 · 边缘信号干扰' };
  return { level: 'stable', label: '认知同步稳定' };
}

export function RunStatusBar({ run, rosmontis, progression }: RunStatusBarProps) {
  const overloadState = getOverloadState(rosmontis.overload);

  return (
    <section
      id="run-status-bar"
      className="run-status-bar"
      aria-label="迷迭香 Run 状态"
      data-overload-level={overloadState.level}
    >
      <div className="run-status-identity">
        <CharacterArtwork
          kind="portrait"
          label="迷迭香人物立绘占位图"
          className="run-status-portrait"
        />
        <div>
          <span>RSM-04 / 单人认知潜入</span>
          <strong>迷迭香</strong>
          <small>{progression.firstClear ? `已完成 ${progression.completedRuns} 次逃离` : '尚未完成首次逃离'}</small>
        </div>
      </div>

      <div className="run-status-mission" aria-label="当前 Run 信息">
        <span>{RUN_MODE_LABELS[run.mode]}</span>
        <strong>{run.seed}</strong>
        <div>
          <span>第 {run.floor} 层</span>
          <span>回合 {run.turn}</span>
          <span id="run-action-points">行动点 {rosmontis.actionPoints}</span>
        </div>
      </div>

      <div className="run-status-vitals">
        <div className="run-status-meter-group">
          <div className="run-status-meter-heading">
            <span id="run-sanity-label">思维稳定性</span>
            <strong>{rosmontis.sanity}</strong>
          </div>
          <div
            id="meter-run-sanity"
            className="run-status-meter"
            role="meter"
            aria-labelledby="run-sanity-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rosmontis.sanity}
          >
            <i style={{ width: `${rosmontis.sanity}%` }} />
          </div>
        </div>

        <div className="run-status-meter-group">
          <div className="run-status-meter-heading">
            <span id="run-overload-label">精神过载度</span>
            <strong>{rosmontis.overload}%</strong>
          </div>
          <div
            id="meter-run-overload"
            className="run-status-meter is-overload"
            role="meter"
            aria-labelledby="run-overload-label"
            aria-describedby="run-overload-status"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={rosmontis.overload}
          >
            <i style={{ width: `${rosmontis.overload}%` }} />
          </div>
          <p id="run-overload-status" role={rosmontis.overload >= 70 ? 'status' : undefined}>
            {overloadState.label}
          </p>
        </div>
      </div>
    </section>
  );
}
