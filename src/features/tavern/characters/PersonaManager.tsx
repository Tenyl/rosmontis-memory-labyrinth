import { IdentificationCard, PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '../../../components/Dialog';
import type { Persona } from '../../../sillytavern';
import { useTavern } from '../runtime/useTavern';

export function PersonaManager() {
  const runtime = useTavern();
  const [editing, setEditing] = useState<Persona | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Persona | null>(null);

  const activate = async (persona: Persona) => {
    if (!runtime.settings) return;
    await runtime.updateSettings({ ...runtime.settings, activePersonaId: persona.id, userName: persona.name });
  };

  return (
    <section className="tavern-subsection" aria-labelledby="persona-manager-title">
      <header><div><span className="panel-code">PLAYER IDENTITY / PERSONA</span><h4 id="persona-manager-title">玩家身份</h4></div><button id="persona-manager-create" className="terminal-button" type="button" onClick={() => setEditing(null)}><Plus size={16} aria-hidden />新建身份</button></header>
      <div className="tavern-asset-grid">
        {runtime.personas.map((persona) => {
          const active = runtime.activePersona?.id === persona.id;
          return <article key={persona.id} aria-label={`玩家身份 ${persona.name}`} className={active ? 'is-active' : ''}><div className="tavern-asset-icon"><IdentificationCard size={22} aria-hidden /></div><div className="tavern-asset-copy"><strong>{persona.name}</strong><p>{persona.description || '未填写玩家身份描述'}</p><span>{Object.keys(persona.variables).length} 个初始变量</span></div><div className="tavern-asset-actions">{active ? <b>当前身份</b> : <button id={`persona-activate-${persona.id}`} type="button" onClick={() => void activate(persona)}>设为当前</button>}<button id={`persona-edit-${persona.id}`} type="button" aria-label={`编辑身份 ${persona.name}`} onClick={() => setEditing(persona)}><PencilSimple size={16} aria-hidden /></button><button id={`persona-delete-${persona.id}`} type="button" aria-label={`删除身份 ${persona.name}`} onClick={() => setDeleteTarget(persona)}><Trash size={16} aria-hidden /></button></div></article>;
        })}
      </div>
      <PersonaEditorDialog persona={editing ?? null} open={editing !== undefined} onClose={() => setEditing(undefined)} onSave={async (persona) => { await runtime.upsertPersona(persona); await activate(persona); }} />
      <Dialog id="persona-delete-dialog" title="确认删除玩家身份" open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} danger footer={<><button className="terminal-button" type="button" onClick={() => setDeleteTarget(null)}>取消</button><button className="terminal-button is-danger" type="button" onClick={() => { if (deleteTarget) void runtime.removePersona(deleteTarget.id); setDeleteTarget(null); }}>确认删除</button></>}><p>身份删除后无法恢复，但不会删除历史会话。</p></Dialog>
    </section>
  );
}

function PersonaEditorDialog({ persona, open, onClose, onSave }: { persona: Persona | null; open: boolean; onClose: () => void; onSave: (persona: Persona) => Promise<void> }) {
  const [draft, setDraft] = useState<Persona>(() => persona ?? blankPersona());
  const [variables, setVariables] = useState('{}');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { const next = persona ?? blankPersona(); setDraft(structuredClone(next)); setVariables(JSON.stringify(next.variables, null, 2)); setError(''); } }, [open, persona]);
  const submit = async (event: FormEvent) => { event.preventDefault(); try { const parsed = JSON.parse(variables) as Record<string, string | number>; if (!draft.name.trim()) throw new Error('身份名称不能为空'); await onSave({ ...draft, name: draft.name.trim(), variables: parsed, updatedAt: Date.now() }); onClose(); } catch (submitError) { setError(submitError instanceof Error ? submitError.message : '身份数据无效'); } };
  return <Dialog id="persona-editor-dialog" title={persona ? '编辑玩家身份' : '新建玩家身份'} open={open} onClose={onClose} eyebrow="PERSONA / PLAYER CONTEXT"><form className="tavern-editor-form" onSubmit={submit}><label htmlFor="persona-editor-name">身份名称<input id="persona-editor-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label htmlFor="persona-editor-avatar">头像 URL 或数据地址<input id="persona-editor-avatar" value={draft.avatar ?? ''} onChange={(event) => setDraft({ ...draft, avatar: event.target.value })} /></label><label htmlFor="persona-editor-description">身份描述<textarea id="persona-editor-description" rows={7} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><label htmlFor="persona-editor-variables">初始变量 JSON<textarea id="persona-editor-variables" rows={8} value={variables} onChange={(event) => setVariables(event.target.value)} /></label>{error ? <p role="alert" className="tavern-form-error">{error}</p> : null}<div className="tavern-editor-actions"><button className="terminal-button" type="button" onClick={onClose}>取消</button><button className="terminal-button is-primary" type="submit">保存身份</button></div></form></Dialog>;
}

function blankPersona(): Persona { const now = Date.now(); return { id: crypto.randomUUID(), name: '', description: '', variables: {}, createdAt: now, updatedAt: now }; }
