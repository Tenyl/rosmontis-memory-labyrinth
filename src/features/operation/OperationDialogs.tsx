import {
  ArrowRight,
  Crosshair,
  AudioWaveform as Waveform,
} from 'lucide-react';
import { Dialog } from '../../components/Dialog';
import type { NarrativeEntry } from '../../types/game';

interface OperationDialogsProps {
  checkEntry: NarrativeEntry | null;
  onCloseCheck: () => void;
}

export function OperationDialogs({ checkEntry, onCloseCheck }: OperationDialogsProps) {
  const check = checkEntry?.check;
  return (
    <Dialog
      id="operation-check-dialog"
      title="意识感知检定记录"
      eyebrow="TACTICAL CHECK / VERIFIED"
      open={Boolean(checkEntry && check)}
      onClose={onCloseCheck}
      footer={(
        <button id="operation-check-dialog-confirm" className="terminal-button is-primary" type="button" onClick={onCloseCheck}>
          返回作战流<ArrowRight size={16} aria-hidden />
        </button>
      )}
    >
      {check ? (
        <div className="check-dialog-content">
          <div className="check-score-visual">
            <span><Crosshair size={24} aria-hidden />{check.attribute}</span>
            <strong>{check.total}</strong>
            <em>{check.result}</em>
          </div>
          <dl className="check-breakdown">
            <div><dt>基础投掷</dt><dd>{check.roll}</dd></div>
            <div><dt>感知修正</dt><dd>+ {check.modifier}</dd></div>
            <div><dt>检定难度</dt><dd>{check.difficulty}</dd></div>
            <div><dt>成功余量</dt><dd>+ {check.total - check.difficulty}</dd></div>
          </dl>
          <div className="check-consequence">
            <Waveform size={20} aria-hidden />
            <div><strong>意识回声定位完成</strong><p>深层潜意识路径已经标定；同步回流使迷迭香精神负荷上升至 57。</p></div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
