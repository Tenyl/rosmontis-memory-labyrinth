import { FloppyDisk, Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTavern } from '../runtime/useTavern';

interface VariableDraft { id: string; key: string; value: string }

export function VariablesPanel() {
  const { activeChat, updateVariables } = useTavern();
  const [drafts, setDrafts] = useState<VariableDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.entries(activeChat?.variables ?? {}).map(([key, value], index) => ({ id: `stored-${index}-${key}`, key, value: String(value) })));
    setError(null);
  }, [activeChat?.id, activeChat?.variables]);

  const save = async () => {
    const normalizedKeys = drafts.map((draft) => draft.key.trim());
    if (normalizedKeys.some((key) => !key)) {
      setError('变量名称不能为空');
      return;
    }
    if (new Set(normalizedKeys).size !== normalizedKeys.length) {
      setError('变量名称不能重复');
      return;
    }
    const next: Record<string, string | number> = {};
    drafts.forEach((draft, index) => {
      const raw = draft.value.trim();
      const numeric = Number(raw);
      next[normalizedKeys[index]] = raw !== '' && Number.isFinite(numeric) ? numeric : draft.value;
    });
    await updateVariables(next);
    setError(null);
  };

  if (!activeChat) return <div id="tavern-panel-variables" role="tabpanel" aria-labelledby="tavern-tab-variables" className="tavern-empty-state">选择一个会话后才能编辑变量。</div>;

  return (
    <section id="tavern-panel-variables" className="tavern-panel-stack" role="tabpanel" aria-labelledby="tavern-tab-variables">
      <header className="tavern-section-heading"><div><span className="panel-code">STATE SNAPSHOT / {activeChat.name.toUpperCase()}</span><h3>回合变量</h3><p>变量会注入提示词，并在每条助手消息中保存可回滚快照。</p></div><button id="tavern-variable-add" className="terminal-button is-secondary" type="button" onClick={() => setDrafts((current) => [...current, { id: crypto.randomUUID(), key: '', value: '' }])}><Plus size={17} aria-hidden />添加变量</button></header>
      <div className="tavern-variable-grid">
        {drafts.map((draft, index) => {
          const label = draft.key || `新变量 ${index + 1}`;
          return (
            <div className="tavern-variable-row" key={draft.id}>
              <div><label htmlFor={`tavern-variable-key-${draft.id}`}>变量名称</label><input id={`tavern-variable-key-${draft.id}`} value={draft.key} onChange={(event) => { const key = event.target.value; setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, key } : item)); setError(null); }} /></div>
              <div><label htmlFor={`tavern-variable-value-${draft.id}`}>变量 {label} 的值</label><input id={`tavern-variable-value-${draft.id}`} value={draft.value} onChange={(event) => { const value = event.target.value; setDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, value } : item)); setError(null); }} /></div>
              <button id={`tavern-variable-${draft.id}-remove`} type="button" aria-label={`删除变量${label}`} onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))}><Trash size={17} aria-hidden /></button>
            </div>
          );
        })}
      </div>
      {drafts.length === 0 ? <div className="tavern-empty-state">当前会话没有变量。添加后会从下一轮开始注入提示词。</div> : null}
      {error ? <p className="tavern-form-error" role="alert">{error}</p> : null}
      <div className="tavern-panel-actions"><button id="tavern-variable-save" className="terminal-button is-primary" type="button" onClick={() => void save()}><FloppyDisk size={17} aria-hidden />保存变量</button></div>
    </section>
  );
}
