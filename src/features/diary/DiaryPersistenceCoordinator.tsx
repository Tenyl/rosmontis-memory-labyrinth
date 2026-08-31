import { useEffect, useRef } from 'react';
import { persistDiaryDraft } from '../../diary/repository';
import { useGameStore } from '../../store/gameStore';

export function DiaryPersistenceCoordinator() {
  const drafts = useGameStore((state) => state.pendingDiaryDrafts);
  const run = useGameStore((state) => state.run);
  const acknowledge = useGameStore((state) => state.acknowledgeDiaryDraft);
  const addNotification = useGameStore((state) => state.addNotification);
  const processing = useRef(new Set<string>());

  useEffect(() => {
    drafts.forEach((draft) => {
      if (processing.current.has(draft.id)) return;
      processing.current.add(draft.id);
      void persistDiaryDraft(draft, run.id, run.floor)
        .then(() => acknowledge(draft.id))
        .catch(() => {
          processing.current.delete(draft.id);
          addNotification({
            id: `notification-diary-write-${draft.id}`,
            kind: 'danger',
            title: '手记写入暂时失败',
            message: 'IndexedDB 无法保存这篇手记；草稿仍保留在本地状态，节点结算与 Run 进度没有回滚。',
            dismissible: true,
          });
        });
    });
  }, [acknowledge, addNotification, drafts, run.floor, run.id]);

  return null;
}
