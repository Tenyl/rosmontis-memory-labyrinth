import { CheckCircle, Database, LockKey } from '@phosphor-icons/react';
import type { MazeNode, MemoryFragment, RuleEvent, RunState } from '../../game/types';

interface NodeResolutionPanelProps {
  run: RunState;
  node: MazeNode;
  ruleLog: RuleEvent[];
  onComplete: (fragment: MemoryFragment) => void;
}

const REWARD_PRESETS: Record<MazeNode['type'], {
  name: string;
  kind: MemoryFragment['kind'];
  tag: string;
}> = {
  'echo-combat': { name: '残响结构样本', kind: 'standard', tag: '战斗' },
  'blank-event': { name: '断层中的空白句', kind: 'standard', tag: '事件' },
  'thought-rest': { name: '温室休整记录', kind: 'standard', tag: '休整' },
  'memory-core': { name: '核心记忆：仍被呼唤的名字', kind: 'core', tag: '核心' },
};

const NODE_TYPE_LABELS: Record<MazeNode['type'], string> = {
  'echo-combat': '残响实体',
  'blank-event': '空白断层',
  'thought-rest': '思维温室',
  'memory-core': '记忆核心',
};

export function getNodeReward(run: RunState, node: MazeNode): MemoryFragment {
  const preset = REWARD_PRESETS[node.type];
  return {
    id: `fragment-${run.id}-${node.id}`,
    name: `第 ${node.floor} 层 · ${preset.name}`,
    kind: preset.kind,
    tags: [preset.tag, `第${node.floor}层`],
  };
}

export function NodeResolutionPanel({ run, node, ruleLog, onComplete }: NodeResolutionPanelProps) {
  const reward = getNodeReward(run, node);
  const settled = node.state === 'completed'
    || ruleLog.some((event) => event.type === 'node.completed' && event.nodeId === node.id);
  const blocked = run.phase === 'fragment-overflow' || run.phase === 'victory' || run.phase === 'defeat';

  return (
    <section className="node-resolution-panel" aria-labelledby="node-resolution-title">
      <header>
        <div>
          <span>NODE SETTLEMENT / DEPTH {String(node.depth).padStart(2, '0')}</span>
          <h2 id="node-resolution-title">当前节点结算</h2>
        </div>
        <strong>{NODE_TYPE_LABELS[node.type]}</strong>
      </header>

      <div className="node-resolution-reward">
        <span className="node-resolution-icon">
          {reward.kind === 'core' ? <LockKey size={22} aria-hidden /> : <Database size={22} aria-hidden />}
        </span>
        <div>
          <small>{reward.kind === 'core' ? 'CORE MEMORY / 受保护' : 'MEMORY FRAGMENT / 常规槽位'}</small>
          <strong>{reward.name}</strong>
          <p>{reward.tags.join(' / ')}</p>
        </div>
      </div>

      <button
        id="btn-complete-current-node"
        className="terminal-button is-primary node-resolution-submit"
        type="button"
        disabled={settled || blocked}
        onClick={() => onComplete(reward)}
        aria-label={settled ? '当前节点已完成结算' : blocked ? '当前阶段不可结算节点' : '完成节点并回收记忆碎片'}
      >
        <CheckCircle size={17} aria-hidden />
        {settled ? '当前节点已完成结算' : '完成节点并回收碎片'}
      </button>
    </section>
  );
}
