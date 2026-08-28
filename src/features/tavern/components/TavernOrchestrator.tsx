import { Database, Pulse, ShieldCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import { SessionManager } from './SessionManager';
import { TavernEntityTabs, type TavernTab } from './TavernEntityTabs';
import { VariablesPanel } from './VariablesPanel';
import { useTavern } from '../runtime/useTavern';
import './tavern-components.css';

interface TavernOrchestratorProps {
  open: boolean;
  onClose: () => void;
}

export function TavernOrchestrator({ open, onClose }: TavernOrchestratorProps) {
  const runtime = useTavern();
  const [activeTab, setActiveTab] = useState<TavernTab>('sessions');
  const counts = {
    sessions: runtime.chats.length,
    characters: runtime.characters.length,
    lorebooks: runtime.lorebooks.length,
    presets: runtime.presets.length,
    variables: Object.keys(runtime.activeChat?.variables ?? {}).length,
  };

  return (
    <Dialog id="tavern-orchestrator-dialog" title="酒馆编排中枢" open={open} onClose={onClose} eyebrow="TAVERN RUNTIME / LOCAL SECURE">
      <div className="tavern-orchestrator">
        <aside className="tavern-orchestrator-sidebar">
          <div className="tavern-runtime-mark"><Pulse size={22} weight="fill" aria-hidden /><div><strong>{runtime.initialized ? '运行时已就绪' : '正在载入运行时'}</strong><small>{runtime.transportMode === 'local' ? 'LOCAL SIMULATION' : 'REMOTE MODEL'}</small></div></div>
          <TavernEntityTabs active={activeTab} onChange={setActiveTab} counts={counts} />
          <div className="tavern-storage-status"><Database size={18} aria-hidden /><div><span>持久化</span><strong>IndexedDB / V4</strong></div><ShieldCheck size={18} aria-label="浏览器本地安全存储" /></div>
        </aside>
        <div className="tavern-orchestrator-content">
          {!runtime.initialized ? <div className="tavern-empty-state" role="status">正在恢复角色、会话与世界书索引。</div> : null}
          {runtime.initialized && activeTab === 'sessions' ? <SessionManager /> : null}
          {runtime.initialized && activeTab === 'variables' ? <VariablesPanel /> : null}
          {runtime.initialized && activeTab === 'characters' ? <EntityInventoryPanel id="characters" title="角色与身份" description="角色卡决定 LLM 的身份、语言和场景；玩家身份独立保存。" items={[...runtime.characters.map((item) => ({ id: item.id, name: item.name, detail: item.personality || '未填写性格' })), ...runtime.personas.map((item) => ({ id: item.id, name: `${item.name} / 玩家身份`, detail: item.description }))]} /> : null}
          {runtime.initialized && activeTab === 'lorebooks' ? <EntityInventoryPanel id="lorebooks" title="世界书索引" description="已启用的条目会按当前输入与最近历史递归匹配。" items={runtime.lorebooks.map((item) => ({ id: item.id, name: item.name, detail: `${item.entries.length} 条目 / ${item.recursiveScanning ? '递归扫描' : '单次扫描'}` }))} /> : null}
          {runtime.initialized && activeTab === 'presets' ? <EntityInventoryPanel id="presets" title="生成预设" description="预设控制采样参数、上下文长度与提示词块顺序。" items={runtime.presets.map((item) => ({ id: item.id, name: item.name, detail: item.description || '未填写说明' }))} /> : null}
        </div>
      </div>
    </Dialog>
  );
}

function EntityInventoryPanel({ id, title, description, items }: { id: 'characters' | 'lorebooks' | 'presets'; title: string; description: string; items: Array<{ id: string; name: string; detail: string }> }) {
  return (
    <section id={`tavern-panel-${id}`} className="tavern-panel-stack" role="tabpanel" aria-labelledby={`tavern-tab-${id}`}>
      <header className="tavern-section-heading"><div><span className="panel-code">ENTITY INDEX / READABLE</span><h3>{title}</h3><p>{description}</p></div><span className="tavern-next-stage">编辑器已接入下一阶段</span></header>
      <div className="tavern-entity-inventory">{items.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.name}</strong><p>{item.detail}</p></div><small>READY</small></article>)}</div>
    </section>
  );
}
