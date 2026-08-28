import { useRef, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import type { NarrativeEntry } from '../../types/game';
import { CommandConsole } from './CommandConsole';
import { createLocalNarrativeEngine } from './narrativeEngine';
import { NarrativeStream } from './NarrativeStream';
import { OperationDialogs } from './OperationDialogs';
import { TacticalOverview } from './TacticalOverview';
import './operation.css';

export default function OperationPage() {
  const engineRef = useRef(createLocalNarrativeEngine());
  const [checkEntry, setCheckEntry] = useState<NarrativeEntry | null>(null);
  const session = useGameStore((state) => state.session);
  const narrative = useGameStore((state) => state.narrative);
  const operatorsState = useGameStore((state) => state.operators);
  const setNarrativeDraft = useGameStore((state) => state.setNarrativeDraft);
  const setInputMode = useGameStore((state) => state.setInputMode);
  const setGenerationStatus = useGameStore((state) => state.setGenerationStatus);
  const setInputError = useGameStore((state) => state.setInputError);
  const startGeneratedEntry = useGameStore((state) => state.startGeneratedEntry);
  const appendGeneratedChunk = useGameStore((state) => state.appendGeneratedChunk);
  const completeNarrativeOutcome = useGameStore((state) => state.completeNarrativeOutcome);
  const addNotification = useGameStore((state) => state.addNotification);

  const operators = operatorsState.squadOrder
    .map((operatorId) => operatorsState.byId[operatorId])
    .filter(Boolean);

  const submitCommand = async () => {
    const command = narrative.draft.trim();
    if (!command) {
      setInputError('请输入行动描述，或从上方选择一项建议');
      return;
    }
    if (narrative.generationStatus === 'streaming' || narrative.generationStatus === 'parsing') return;

    const entryId = 'narrative-check-09';
    setGenerationStatus('parsing');
    startGeneratedEntry(command, entryId);

    try {
      const outcome = await engineRef.current.run(command, (chunk) => {
        appendGeneratedChunk(entryId, chunk);
      });
      completeNarrativeOutcome(outcome);
    } catch (error) {
      setGenerationStatus('interrupted');
      addNotification({
        id: 'notification-generation-interrupted',
        kind: 'danger',
        title: '叙事生成中断',
        message: error instanceof Error ? error.message : '本地叙事引擎返回未知错误。',
        dismissible: true,
      });
    }
  };

  const pauseGeneration = () => {
    engineRef.current.pause();
    setGenerationStatus('paused');
  };

  const resumeGeneration = () => {
    engineRef.current.resume();
    setGenerationStatus('streaming');
  };

  return (
    <section className="route-page operation-route" aria-labelledby="operation-page-title">
      <PageHeader
        id="operation-page-title"
        code="01"
        title="作战主控台"
        description="解析剧情、执行战术指令并监控小队状态。本地叙事模型将每次行动同步为可追溯的战术记录。"
        meta="LIVE SESSION / 03:31"
      />

      <div className="operation-workbench">
        <div className="operation-primary">
          <NarrativeStream
            entries={narrative.entries}
            activeEntryId={narrative.activeEntryId}
            onOpenCheck={setCheckEntry}
          />
          <CommandConsole
            draft={narrative.draft}
            inputMode={narrative.inputMode}
            suggestions={narrative.suggestions}
            status={narrative.generationStatus}
            error={narrative.inputError}
            onDraftChange={setNarrativeDraft}
            onModeChange={setInputMode}
            onSubmit={() => void submitCommand()}
            onPause={pauseGeneration}
            onResume={resumeGeneration}
          />
        </div>
        <TacticalOverview session={session} operators={operators} />
      </div>

      <OperationDialogs checkEntry={checkEntry} onCloseCheck={() => setCheckEntry(null)} />
    </section>
  );
}
