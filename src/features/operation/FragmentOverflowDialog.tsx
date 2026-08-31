import { WarningDiamond } from '@phosphor-icons/react';
import { Dialog } from '../../components/Dialog';
import { resolveImageAsset } from '../../assets/assetRegistry';
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
            <p>博士……我的脑子好胀，我快记不住全部了……我可以忘记这个吗？你会帮我记住的，对不对？</p>
          </div>

          <section aria-labelledby="pending-fragment-title">
            <span>等待装载</span>
            <img src={resolveImageAsset('memoryFragment')} alt="记忆碎片资源占位图" />
            <h3 id="pending-fragment-title">{pending.name}</h3>
          </section>

          <section aria-labelledby="replace-fragment-title">
            <span>选择要遗忘的普通碎片</span>
            <h3 id="replace-fragment-title">常规记忆槽</h3>
            <div className="fragment-replacement-list">
              {inventory.fragments.map((fragment) => (
                <div className="fragment-replacement-choice" key={fragment.id}>
                  <div><strong>{fragment.name}</strong><small>{fragment.tags.join(' / ')}</small></div>
                  <button
                    id={`btn-fragment-replace-${fragment.id}`}
                    type="button"
                    onClick={() => onResolve({ type: 'replace', fragmentId: fragment.id })}
                    aria-label={`直接遗忘“${fragment.name}”并装载“${pending.name}”`}
                  >直接遗忘</button>
                  <button
                    id={`btn-fragment-transcribe-${fragment.id}`}
                    type="button"
                    onClick={() => onResolve({ type: 'transcribe-and-replace', fragmentId: fragment.id })}
                    aria-label={`抄录“${fragment.name}”至手记簿并装载“${pending.name}”`}
                  >抄录至手记簿</button>
                </div>
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
