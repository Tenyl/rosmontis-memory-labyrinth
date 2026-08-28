import { DownloadSimple, PencilSimple, Plus, Trash, UploadSimple, UserFocus } from '@phosphor-icons/react';
import { useState, type ChangeEvent } from 'react';
import { Dialog } from '../../../components/Dialog';
import { exportCharacterCardV2, exportToJson, importCharacterCardV2, type CharacterCard } from '../../../sillytavern';
import { useTavern } from '../runtime/useTavern';
import { CharacterEditorDialog } from './CharacterEditorDialog';
import { PersonaManager } from './PersonaManager';

export function CharacterManager() {
  const runtime = useTavern();
  const [editing, setEditing] = useState<CharacterCard | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CharacterCard | null>(null);
  const [error, setError] = useState('');

  const activate = async (character: CharacterCard) => {
    if (!runtime.settings) return;
    await runtime.updateSettings({ ...runtime.settings, activeCharacterId: character.id, characterName: character.name });
  };

  const importCard = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const card = importCharacterCardV2(JSON.parse(await file.text()));
      await runtime.upsertCharacter(card);
      await activate(card);
    } catch {
      setError('角色卡导入失败：文件不是有效的 SillyTavern V2 JSON。');
    }
  };

  return (
    <section id="tavern-panel-characters" className="tavern-panel-stack" role="tabpanel" aria-labelledby="tavern-tab-characters">
      <header className="tavern-section-heading"><div><span className="panel-code">CHARACTER & PERSONA / V2</span><h3>角色与身份</h3><p>角色卡决定模型的叙事人格；玩家身份作为独立上下文注入，不会改变战术小队编制。</p></div><div className="tavern-toolbar"><label id="character-import-label" className="terminal-button" htmlFor="character-import-input"><UploadSimple size={16} aria-hidden />导入角色卡</label><input id="character-import-input" className="visually-hidden" type="file" accept=".json,application/json" aria-label="导入 SillyTavern V2 角色卡" onChange={(event) => void importCard(event)} /><button id="character-create-button" className="terminal-button is-primary" type="button" onClick={() => setEditing(null)}><Plus size={16} aria-hidden />新建角色</button></div></header>
      {error ? <p role="alert" className="tavern-form-error">{error}</p> : null}
      <div className="tavern-asset-grid">
        {runtime.characters.map((character) => {
          const active = runtime.activeCharacter?.id === character.id;
          return <article key={character.id} aria-label={`角色卡 ${character.name}`} className={active ? 'is-active' : ''}><div className="tavern-asset-icon">{character.avatar ? <img src={character.avatar} alt="" /> : <UserFocus size={24} aria-hidden />}</div><div className="tavern-asset-copy"><strong>{character.name}</strong><p>{character.personality || character.description || '尚未写入角色描述'}</p><span>{character.tags.length ? character.tags.join(' / ') : 'UNTAGGED'} · V{character.characterVersion || '1.0'}</span></div><div className="tavern-asset-actions">{active ? <b>当前角色</b> : <button id={`character-activate-${character.id}`} type="button" onClick={() => void activate(character)}>设为当前</button>}<button id={`character-edit-${character.id}`} type="button" aria-label={`编辑角色 ${character.name}`} onClick={() => setEditing(character)}><PencilSimple size={16} aria-hidden /></button><button id={`character-export-${character.id}`} type="button" aria-label={`导出角色 ${character.name}`} onClick={() => exportToJson(exportCharacterCardV2(character), `${safeName(character.name)}.json`)}><DownloadSimple size={16} aria-hidden /></button><button id={`character-delete-${character.id}`} type="button" aria-label={`删除角色 ${character.name}`} onClick={() => setDeleteTarget(character)}><Trash size={16} aria-hidden /></button></div></article>;
        })}
      </div>
      <PersonaManager />
      <CharacterEditorDialog character={editing ?? null} open={editing !== undefined} onClose={() => setEditing(undefined)} onSave={async (character) => { await runtime.upsertCharacter(character); await activate(character); }} />
      <Dialog id="character-delete-dialog" title="确认删除角色卡" open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} danger footer={<><button className="terminal-button" type="button" onClick={() => setDeleteTarget(null)}>取消</button><button className="terminal-button is-danger" type="button" onClick={() => { if (deleteTarget) void runtime.removeCharacter(deleteTarget.id); setDeleteTarget(null); }}>确认删除</button></>}><p>删除角色卡不会移除既有会话记录，但后续生成将无法使用该身份。</p></Dialog>
    </section>
  );
}

function safeName(name: string) { return name.replace(/[\\/:*?"<>|]/g, '_'); }
