import {
  ArrowRight,
  Eye,
  KeyRound as LockKey,
  Shield as ShieldChevron,
  TriangleAlert as WarningDiamond,
  AudioWaveform as Waveform,
} from 'lucide-react';
import { NODE_TYPE_NAMES } from '../../game/terminology';

import type {
  ExplorationCharges,
  ExplorationPowerAction,
  MazeEdge,
  MazeNode,
  MazeNodeType,
} from '../../game/types';

interface NodeIntelPanelProps {
  node: MazeNode;
  currentNodeId: string;
  lockedEdges: MazeEdge[];
  explorationCharges: ExplorationCharges;
  scoutPoints: number;
  movementLocked?: boolean;
  onMove: (nodeId: string) => void;
  onUseExplorationPower: (action: ExplorationPowerAction) => void;
  onSpendScoutPoint: (nodeId: string) => void;
}

const MODIFIER_LABELS: Record<string, string> = {
  'high-threat': '高威胁残响',
  'unstable-signal': '信号极不稳定',
  'two-phase-core': '双阶段核心',
};

export function NodeIntelPanel({
  node,
  currentNodeId,
  lockedEdges,
  explorationCharges,
  scoutPoints,
  movementLocked = false,
  onMove,
  onUseExplorationPower,
  onSpendScoutPoint,
}: NodeIntelPanelProps) {
  const isCurrent = node.id === currentNodeId;
  const isReachable = node.state === 'reachable';
  const canScan = node.type === 'unknown' && !node.revealed && isReachable;
  const heading = node.type === 'unknown' ? '未知信号' : NODE_TYPE_NAMES[node.type];

  return (
    <aside className="node-intel-panel" aria-labelledby="node-intel-title">
      <header>
        <div>
          <span>NODE INTELLIGENCE / DEPTH {String(node.depth).padStart(2, '0')}</span>
          <h2 id="node-intel-title">{heading}</h2>
        </div>
        <strong className={`node-risk is-${node.risk}`}>
          <WarningDiamond size={18} aria-hidden />
          风险 {node.risk}
        </strong>
      </header>

      <div className="node-intel-body">
        <dl>
          <div><dt>节点状态</dt><dd>{isCurrent ? '当前节点' : isReachable ? '可抵达' : '路径未开放'}</dd></div>
          <div><dt>公开类型</dt><dd>{NODE_TYPE_NAMES[node.type]}</dd></div>
          {node.type === 'unknown' && node.revealed && node.hiddenType ? (
            <div className="is-revealed"><dt>侦测结果</dt><dd>真实类型：{NODE_TYPE_NAMES[node.hiddenType]}</dd></div>
          ) : null}
        </dl>

        <section aria-labelledby="node-modifier-title">
          <h3 id="node-modifier-title">环境修饰</h3>
          {node.modifiers.length ? (
            <ul>
              {node.modifiers.map((modifier) => (
                <li key={modifier}>{MODIFIER_LABELS[modifier] ?? modifier}</li>
              ))}
            </ul>
          ) : <p>未检测到额外修饰。</p>}
        </section>
      </div>

      <div className="node-intel-actions" aria-label="节点与探索操作">
        {canScan ? (
          <>
            <button
              id={`btn-scan-perception-${node.id}`}
              type="button"
              className="terminal-button is-secondary"
              disabled={explorationCharges.perception === 0}
              onClick={() => onUseExplorationPower({ swordId: 'perception', nodeId: node.id })}
            >
              <Eye size={18} aria-hidden />
              感知侦测
            </button>
            <button
              id={`btn-scan-point-${node.id}`}
              type="button"
              className="terminal-button is-secondary"
              disabled={scoutPoints <= 0}
              onClick={() => onSpendScoutPoint(node.id)}
            >
              <Eye size={18} aria-hidden />
              消耗 1 点侦测
            </button>
          </>
        ) : null}

        {isCurrent && lockedEdges[0] ? (
          <button
            id={`btn-breach-edge-${lockedEdges[0].id}`}
            type="button"
            className="terminal-button is-secondary"
            disabled={explorationCharges.breach === 0}
            onClick={() => onUseExplorationPower({ swordId: 'breach', edgeId: lockedEdges[0].id })}
          >
            <LockKey size={18} aria-hidden />
            破壁开路
          </button>
        ) : null}

        {isCurrent ? (
          <>
            <button
              id="btn-exploration-watch"
              type="button"
              className="terminal-button is-secondary"
              disabled={explorationCharges.watch === 0}
              onClick={() => onUseExplorationPower({ swordId: 'watch' })}
            >
              <ShieldChevron size={18} aria-hidden />
              守望防护
            </button>
            <button
              id="btn-exploration-resonance"
              type="button"
              className="terminal-button is-secondary"
              disabled={explorationCharges.resonance === 0}
              onClick={() => onUseExplorationPower({ swordId: 'resonance' })}
            >
              <Waveform size={18} aria-hidden />
              预备共鸣
            </button>
          </>
        ) : null}

        {isReachable ? (
          <>
            {movementLocked ? <p className="node-movement-lock">博士……眼前的残响还没消散，我的剑还没收回来……等我一下，好吗？</p> : null}
            <button
              id={`btn-enter-node-${node.id}`}
              type="button"
              className="terminal-button is-primary node-enter-action"
              disabled={movementLocked}
              aria-label={movementLocked ? '迷迭香请求先完成眼前的残响' : '进入节点'}
              onClick={() => onMove(node.id)}
            >
              {movementLocked ? '等我收回巨剑' : '进入节点'}
              <ArrowRight size={18} aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </aside>
  );
}
