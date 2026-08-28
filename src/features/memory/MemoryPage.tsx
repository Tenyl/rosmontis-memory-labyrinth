import { Graph, ListDashes } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import type { MemoryDirection } from '../../types/game';
import { ExpansionDialog, HighRiskDialog } from './ExpansionDialog';
import { MemoryGraph } from './MemoryGraph';
import { MemoryInspector } from './MemoryInspector';
import { MemoryList } from './MemoryList';
import './memory.css';

export default function MemoryPage() {
  const memoryMap = useGameStore((state) => state.memoryMap);
  const selectMemoryNode = useGameStore((state) => state.selectMemoryNode);
  const setMemoryView = useGameStore((state) => state.setMemoryView);
  const expandMemoryNode = useGameStore((state) => state.expandMemoryNode);
  const addNotification = useGameStore((state) => state.addNotification);
  const [expansionDirection, setExpansionDirection] = useState<MemoryDirection | null>(null);
  const [highRiskOpen, setHighRiskOpen] = useState(false);

  const selectedNode = memoryMap.nodes.find((node) => node.id === memoryMap.selectedNodeId) ?? null;

  useEffect(() => {
    if (window.matchMedia?.('(max-width: 767px)').matches && memoryMap.viewMode === 'graph') {
      setMemoryView('list');
    }
  }, []); // Keep the user's stored desktop selection after the first mobile adaptation.

  const notify = (title: string, message: string) => {
    addNotification({
      id: `memory-notification-${title}`,
      kind: 'processing',
      title,
      message,
      dismissible: true,
    });
  };

  const enterNode = () => {
    if (!selectedNode) return;
    if (selectedNode.risk === 'A' || selectedNode.risk === 'S') {
      setHighRiskOpen(true);
      return;
    }
    notify('节点接入中', `小队正向“${selectedNode.title}”移动，叙事上下文将在作战主控台继续。`);
  };

  const confirmExpansion = () => {
    if (!selectedNode || !expansionDirection) return;
    expandMemoryNode(selectedNode.id, expansionDirection);
    setExpansionDirection(null);
  };

  return (
    <section className="route-page memory-route" aria-labelledby="memory-page-title">
      <PageHeader
        code="02"
        title="意识战场"
        description="在表层记忆中定位战术节点，向下侵入深层潜意识，或向左右未解析战局建立可追溯路径。"
        meta={`LAYER 00 / ${memoryMap.nodes.length} NODES`}
        actions={(
          <SegmentedControl
            id="memory-view-switch"
            label="意识战场视图"
            value={memoryMap.viewMode}
            items={[
              { value: 'graph', label: '拓扑图', count: memoryMap.nodes.length },
              { value: 'list', label: '战术列表' },
            ]}
            onChange={setMemoryView}
          />
        )}
      />

      <div className="memory-summary-strip" aria-label="意识战场概况">
        <div><span>表层节点</span><strong>03</strong><small>已建立</small></div>
        <div><span>深层路径</span><strong>{String(memoryMap.nodes.filter((node) => node.layer === '深层潜意识').length).padStart(2, '0')}</strong><small>待解析</small></div>
        <div><span>意识污染</span><strong>37.4</strong><small>% 波动</small></div>
        <div><span>当前载荷</span><strong>41</strong><small>/ 100</small></div>
        <div className="memory-signal"><Graph size={18} aria-hidden /><span>拓扑信号</span><strong>稳定</strong></div>
      </div>

      <div className="memory-workbench">
        <main className="memory-primary">
          {memoryMap.viewMode === 'graph' ? (
            <MemoryGraph nodes={memoryMap.nodes} edges={memoryMap.edges} selectedNodeId={memoryMap.selectedNodeId} onSelect={selectMemoryNode} />
          ) : (
            <MemoryList nodes={memoryMap.nodes} selectedNodeId={memoryMap.selectedNodeId} onSelect={selectMemoryNode} />
          )}
          <div className="memory-access-note"><ListDashes size={16} aria-hidden /><span>所有拓扑节点均可通过“战术列表”以键盘完整访问。</span></div>
        </main>
        <MemoryInspector node={selectedNode} onExpand={setExpansionDirection} onEnter={enterNode} onNotify={notify} />
      </div>

      <ExpansionDialog source={selectedNode} direction={expansionDirection} onClose={() => setExpansionDirection(null)} onConfirm={confirmExpansion} />
      <HighRiskDialog
        node={selectedNode}
        open={highRiskOpen}
        onClose={() => setHighRiskOpen(false)}
        onConfirm={() => {
          setHighRiskOpen(false);
          notify('高危节点接入中', `小队已确认进入“${selectedNode?.title ?? '未知节点'}”，医疗监测提升至战术级。`);
        }}
      />
    </section>
  );
}
