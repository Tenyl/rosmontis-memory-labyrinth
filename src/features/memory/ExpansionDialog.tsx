import { ArrowDown, ArrowLeft, ArrowRight, Path, WarningDiamond } from '@phosphor-icons/react';
import { Dialog } from '../../components/Dialog';
import type { MemoryDirection, MemoryNode } from '../../types/game';

interface ExpansionDialogProps {
  source: MemoryNode | null;
  direction: MemoryDirection | null;
  onClose: () => void;
  onConfirm: () => void;
}

const profiles = {
  left: { label: '向左 / 未知战局', title: '逆流的地下档案室', risk: 'B', load: '+8', Icon: ArrowLeft },
  down: { label: '向下 / 深层潜意识', title: '沉没的儿童诊疗层', risk: 'A', load: '+16', Icon: ArrowDown },
  right: { label: '向右 / 未知战局', title: '雨停后的空白病区', risk: 'B', load: '+10', Icon: ArrowRight },
};

export function ExpansionDialog({ source, direction, onClose, onConfirm }: ExpansionDialogProps) {
  const profile = direction ? profiles[direction] : null;
  return (
    <Dialog
      id="memory-expansion-dialog"
      title="确认意识路径拓建"
      eyebrow="COGNITION PATH / CONSTRUCTION"
      open={Boolean(source && profile)}
      danger={profile?.risk === 'A'}
      onClose={onClose}
      footer={(
        <>
          <button id="memory-expansion-cancel" className="terminal-button is-secondary" type="button" onClick={onClose}>取消</button>
          <button id="memory-expansion-confirm" className="terminal-button is-primary" type="button" onClick={onConfirm}>确认拓建<Path size={17} weight="bold" aria-hidden /></button>
        </>
      )}
    >
      {source && profile ? (
        <div className="expansion-dialog-content">
          <div className="expansion-route-visual">
            <div><small>起点</small><strong>{source.title}</strong><span>危险 {source.risk}</span></div>
            <i><profile.Icon size={24} aria-hidden /></i>
            <div><small>预估坐标</small><strong>{profile.title}</strong><span>危险 {profile.risk}</span></div>
          </div>
          <dl className="expansion-telemetry">
            <div><dt>拓建方向</dt><dd>{profile.label}</dd></div>
            <div><dt>预计精神负荷</dt><dd>{profile.load}</dd></div>
            <div><dt>信号完整度</dt><dd>41%</dd></div>
          </dl>
          <div className="expansion-warning"><WarningDiamond size={20} weight="fill" aria-hidden /><p><strong>不可预演路径</strong>该操作会立即建立新战术节点并写入行动记录。未知意识内容只在首次进入后解析。</p></div>
        </div>
      ) : null}
    </Dialog>
  );
}

interface HighRiskDialogProps {
  node: MemoryNode | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function HighRiskDialog({ node, open, onClose, onConfirm }: HighRiskDialogProps) {
  return (
    <Dialog
      id="memory-high-risk-dialog"
      title="高危节点进入确认"
      eyebrow="RISK CONTROL / LEVEL A"
      open={open && Boolean(node)}
      danger
      onClose={onClose}
      footer={(
        <>
          <button id="memory-high-risk-cancel" className="terminal-button is-secondary" type="button" onClick={onClose}>保持当前位置</button>
          <button id="memory-high-risk-confirm" className="terminal-button is-primary" type="button" onClick={onConfirm}>确认进入</button>
        </>
      )}
    >
      <div className="high-risk-content"><WarningDiamond size={38} weight="fill" aria-hidden /><div><strong>{node?.title}</strong><p>节点存在持续精神污染与敌对意识投影。建议先启用巨剑守望协议，并将迷迭香负荷控制在 70 以下。</p></div></div>
    </Dialog>
  );
}
