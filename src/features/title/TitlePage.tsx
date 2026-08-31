import { Archive, CirclePlay, Database, FastForward, Settings } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSaveSlot, listSaveSlots, loadSaveSlot, setActiveSaveSlotId, type SaveSlotId } from '../../game/saveSlots';
import { useGameStore } from '../../store/gameStore';
import { getAvailableModes } from '../../game/run';
import type { ContentMode, RunMode } from '../../game/types';
import { createBoundGameRunSession } from '../../llm/tavernRunSession';
import { useTavern } from '../tavern/runtime/useTavern';
import './title.css';

export default function TitlePage() {
  const navigate = useNavigate();
  const runtime = useTavern();
  const startRun = useGameStore((state) => state.startRun);
  const progression = useGameStore((state) => state.progression);
  const [selectingSlot, setSelectingSlot] = useState(false);
  const [mode, setMode] = useState<RunMode>('preset');
  const [contentMode, setContentMode] = useState<ContentMode>('local');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const llmEnabled = Boolean(runtime.settings?.api.apiKey.trim());
  const slots = useMemo(() => listSaveSlots(localStorage), [revision]);
  const recent = [...slots]
    .filter((slot) => slot.snapshot)
    .sort((a, b) => (b.snapshot?.savedAt ?? '').localeCompare(a.snapshot?.savedAt ?? ''))[0];

  const start = async (slotId: SaveSlotId) => {
    const occupied = loadSaveSlot(slotId, localStorage);
    if (occupied && !window.confirm('该存档槽已有记录。是否覆盖并开始新的记忆潜入？')) return;
    const selectedContentMode = mode === 'novel' ? 'ai-director' : contentMode;
    const runId = `RUN-${Date.now().toString(36).toUpperCase()}-${slotId.toUpperCase()}`;
    setStarting(true);
    setStartError(null);
    try {
      let aiBinding = undefined;
      if (selectedContentMode === 'ai-director') {
        aiBinding = await createBoundGameRunSession(runtime, runId, `记忆潜入 · ${runId}`);
      }
      startRun(runId, mode, llmEnabled, true, {
        runId,
        contentMode: selectedContentMode,
        narrativeStyle: mode === 'novel' ? 'novel' : 'tactical',
        aiFailurePolicy: 'ask',
        ...(aiBinding ? { aiBinding } : {}),
      });
      setActiveSaveSlotId(slotId, localStorage);
      createSaveSlot(slotId, useGameStore.getState(), localStorage);
      const replacedChatId = occupied?.state.run.aiBinding.chatId;
      if (replacedChatId && replacedChatId !== aiBinding?.chatId) {
        await runtime.removeChat(replacedChatId);
      }
      setRevision((value) => value + 1);
      navigate('/game');
    } catch (error) {
      setStartError(error instanceof Error ? error.message : '潜入初始化失败');
    } finally {
      setStarting(false);
    }
  };

  const continueRun = () => {
    if (!recent?.snapshot) return;
    useGameStore.setState(recent.snapshot.state);
    setActiveSaveSlotId(recent.id, localStorage);
    navigate('/game');
  };

  return (
    <section className="title-screen" aria-labelledby="title-screen-heading">
      <div className="title-depth-layer is-grid" aria-hidden="true" />
      <div className="title-depth-layer is-signal" aria-hidden="true" />
      <div className="title-hero">
        <span>RHODES ISLAND COGNITION DIVE</span>
        <a id="title-brand-home" className="title-brand-link" href="/" aria-label="迷迭香的记忆迷宫"><h1 id="title-screen-heading">迷迭香的记忆迷宫</h1></a>
        <p>引导迷迭香穿过破碎的记忆，找回仍在呼唤她的名字。</p>
      </div>

      {!selectingSlot ? (
        <div className="title-actions" aria-label="开屏菜单">
          <button id="title-start-game" type="button" className="is-primary" aria-label="开始游戏" onClick={() => setSelectingSlot(true)}><CirclePlay aria-hidden /><span><strong>开始游戏</strong><small>建立新的认知潜入记录</small></span></button>
          <button id="title-continue-game" type="button" aria-label="继续游戏" disabled={!recent} onClick={continueRun}><FastForward aria-hidden /><span><strong>继续游戏</strong><small>{recent?.snapshot ? `第 ${recent.snapshot.summary.floor} 层 · ${recent.snapshot.savedAt.slice(0, 10)}` : '暂无可继续的潜入记录'}</small></span></button>
          <button id="title-records" type="button" onClick={() => navigate('/records')}><Archive aria-hidden /><span><strong>读取记录</strong><small>查看已经结束的潜入</small></span></button>
          <button id="title-settings" type="button" onClick={() => navigate('/settings')}><Settings aria-hidden /><span><strong>系统设置</strong><small>接口、显示与辅助功能</small></span></button>
        </div>
      ) : (
        <div className="save-slot-panel" aria-label="选择存档槽">
          <header><Database aria-hidden /><div><span>LOCAL SAVE ARRAY</span><h2>选择存档槽</h2></div></header>
          <fieldset className="title-mode-grid">
            <legend>潜入模式</legend>
            {(['preset', 'endless', 'novel'] as RunMode[]).map((candidate) => {
              const unlocked = getAvailableModes(progression, llmEnabled).includes(candidate);
              const name = candidate === 'preset' ? '预设迷宫' : candidate === 'endless' ? '本地无尽' : '小说剧情';
              const description = candidate === 'preset' ? '五层标准潜入' : candidate === 'endless' ? '持续生成随机楼层' : '由远程模型扩写迷宫';
              return <label key={candidate} htmlFor={`title-mode-${candidate}`} className={unlocked ? '' : 'is-locked'}>
                <input id={`title-mode-${candidate}`} type="radio" name="title-run-mode" value={candidate} checked={mode === candidate} disabled={!unlocked} onChange={() => setMode(candidate)} />
                <span><strong>{name}</strong><small>{unlocked ? description : candidate === 'novel' && !llmEnabled ? '首次通关并接入 LLM 后解锁' : '首次通关后解锁'}</small></span>
              </label>;
            })}
          </fieldset>
          <fieldset className="title-mode-grid title-content-mode-grid">
            <legend>内容驱动</legend>
            <label htmlFor="title-content-local">
              <input
                id="title-content-local"
                type="radio"
                name="title-content-mode"
                value="local"
                checked={contentMode === 'local'}
                onChange={() => setContentMode('local')}
              />
              <span><strong>本地规则模式</strong><small>完整离线游玩，不显示 AI 交互</small></span>
            </label>
            <label htmlFor="title-content-ai" className={llmEnabled ? '' : 'is-locked'}>
              <input
                id="title-content-ai"
                type="radio"
                name="title-content-mode"
                value="ai-director"
                checked={contentMode === 'ai-director'}
                disabled={!llmEnabled}
                onChange={() => setContentMode('ai-director')}
              />
              <span><strong>AI 导演模式</strong><small>{llmEnabled ? '世界书与预设参与节点叙事' : '请先在系统设置中连接 LLM'}</small></span>
            </label>
          </fieldset>
          <div className="save-slot-grid">
            {slots.map((slot) => (
              <button id={`title-${slot.id}`} key={slot.id} type="button" disabled={starting} onClick={() => void start(slot.id)} aria-label={`${slot.label}${slot.snapshot ? `，第 ${slot.snapshot.summary.floor} 层` : '，空白记录'}`}>
                <span>{slot.label}</span>
                <strong>{slot.snapshot ? `第 ${slot.snapshot.summary.floor} 层` : '空白记录'}</strong>
                <small>{slot.snapshot ? `稳定 ${slot.snapshot.summary.sanity} · 过载 ${slot.snapshot.summary.overload}%` : '可建立新的潜入'}</small>
              </button>
            ))}
          </div>
          {startError ? <p className="title-start-error" role="alert">{startError}</p> : null}
          <button id="title-cancel-slot" className="save-slot-cancel" type="button" onClick={() => setSelectingSlot(false)}>返回开屏</button>
        </div>
      )}

      <footer>本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。</footer>
    </section>
  );
}
