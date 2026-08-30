import { WarningDiamond } from '@phosphor-icons/react';
import { Dialog } from '../../components/Dialog';
import type { FragmentOverflowChoice, MemoryInventory } from '../../game/types';

interface FragmentOverflowDialogProps {
  inventory: MemoryInventory;
  onResolve: (choice: FragmentOverflowChoice) => void;
}

export function FragmentOverflowDialog({ inventory, onResolve }: FragmentOverflowDialogProps) {
  const pending = inventory.pendingFragment;

  return (
    <Dialog
      id="fragment-overflow-dialog"
      title="记忆槽位溢出：必须遗忘"
      eyebrow="COGNITION WARNING / BLOCKING CHOICE"
      open={Boolean(pending)}
      onClose={() => undefined}
      closeOnEscape={false}
      dismissible={false}
      danger
      footer={pending ? (
        <button
          id="btn-fragment-discard-pending"
          className="terminal-button is-danger"
          type="button"
          onClick={() => onResolve({ type: 'discard-pending' })}
          aria-label={`放弃新碎片：${pending.name}`}
        >
          放弃新碎片
        </button>
      ) : null}
    >
      {pending ? (
        <div className="fragment-overflow-content">
          <div className="fragment-overflow-warning">
            <WarningDiamond size={22} aria-hidden />
            <p>常规记忆槽位已满。继续潜入前，必须放弃新碎片或明确遗忘一段普通记忆。</p>
          </div>

          <section aria-labelledby="pending-fragment-title">
            <span>等待装载</span>
            <h3 id="pending-fragment-title">{pending.name}</h3>
          </section>

          <section aria-labelledby="replace-fragment-title">
            <span>选择要遗忘的普通碎片</span>
            <h3 id="replace-fragment-title">常规记忆槽</h3>
            <div className="fragment-replacement-list">
              {inventory.fragments.map((fragment) => (
                <button
                  id={`btn-fragment-replace-${fragment.id}`}
                  key={fragment.id}
                  type="button"
                  onClick={() => onResolve({ type: 'replace', fragmentId: fragment.id })}
                  aria-label={`遗忘“${fragment.name}”并装载“${pending.name}”`}
                >
                  <strong>{fragment.name}</strong>
                  <small>{fragment.tags.join(' / ')}</small>
                </button>
              ))}
            </div>
          </section>

          {inventory.coreFragments.length > 0 ? (
            <section className="fragment-core-protection" aria-labelledby="protected-fragment-title">
              <span id="protected-fragment-title">核心保护 · 不可遗忘</span>
              <ul>
                {inventory.coreFragments.map((fragment) => <li key={fragment.id}>{fragment.name}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
