import { Graph, ListDashes } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import { RunMazePanel } from './RunMazePanel';
import './memory.css';

const RUN_PHASE_LABELS = {
  idle: '待机',
  exploring: '探索中',
  resolving: '结算中',
  'fragment-overflow': '等待遗忘选择',
  victory: '已逃离',
  defeat: '链路中断',
} as const;

export default function MemoryPage() {
  const viewMode = useGameStore((state) => state.memoryMap.viewMode);
  const setMemoryView = useGameStore((state) => state.setMemoryView);
  const run = useGameStore((state) => state.run);
  const maze = useGameStore((state) => state.maze);
  const rosmontis = useGameStore((state) => state.rosmontis);
  const inventory = useGameStore((state) => state.memoryInventory);
  const moveToNode = useGameStore((state) => state.moveToNode);

  useEffect(() => {
    if (window.matchMedia?.('(max-width: 767px)').matches && viewMode === 'graph') {
      setMemoryView('list');
    }
  }, []); // Apply the mobile-safe list once without overriding later user choices.

  const completedNodeCount = maze.nodes.filter((node) => node.state === 'completed').length;
  const reachableNodeCount = maze.nodes.filter((node) => node.state === 'reachable').length;

  return (
    <section className="route-page memory-route" aria-labelledby="memory-page-title">
      <PageHeader
        id="memory-page-title"
        code="02"
        title="意识战场"
        description="读取当前 Run 的神经拓扑，选择已连通节点，引导迷迭香穿过破碎记忆并抵达记忆核心。"
        meta={`FLOOR ${String(run.floor).padStart(2, '0')} / ${maze.nodes.length} NODES`}
        actions={(
          <SegmentedControl
            id="memory-view-switch"
            label="记忆迷宫视图"
            value={viewMode}
            items={[
              { value: 'graph', label: '拓扑图', count: maze.nodes.length },
              { value: 'list', label: '战术列表' },
            ]}
            onChange={setMemoryView}
          />
        )}
      />

      <div className="memory-summary-strip" aria-label="当前迷宫概况">
        <div><span>当前层级</span><strong>第 {run.floor} 层</strong><small>{run.mode.toUpperCase()}</small></div>
        <div><span>迷宫规模</span><strong>{maze.nodes.length} 个节点</strong><small>{completedNodeCount} 已完成</small></div>
        <div><span>可选路径</span><strong>{String(reachableNodeCount).padStart(2, '0')}</strong><small>条已连通</small></div>
        <div><span>记忆载荷</span><strong>{inventory.fragments.length + inventory.coreFragments.length}</strong><small>/ {inventory.capacity} 常规槽</small></div>
        <div className="memory-signal"><Graph size={18} aria-hidden /><span>认知链路</span><strong>{RUN_PHASE_LABELS[run.phase]} · {rosmontis.sanity}</strong></div>
      </div>

      <RunMazePanel
        maze={maze}
        currentNodeId={run.currentNodeId}
        viewMode={viewMode}
        onMove={moveToNode}
      />

      <div className="memory-access-note">
        <ListDashes size={16} aria-hidden />
        <span>拓扑图与战术列表使用同一组节点；战术列表可用键盘完成全部移动。</span>
      </div>
    </section>
  );
}
