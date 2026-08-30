import { Database, Pulse, ShieldCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import { LorebookManager } from '../lorebooks/LorebookManager';
import { PresetManager } from '../presets/PresetManager';
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
          {runtime.initialized && activeTab === 'lorebooks' ? <LorebookManager /> : null}
          {runtime.initialized && activeTab === 'presets' ? <PresetManager /> : null}
        </div>
      </div>
    </Dialog>
  );
}
