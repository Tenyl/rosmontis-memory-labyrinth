import { useEffect, useState, type FormEvent } from 'react';
import { Dialog } from '../../../components/Dialog';
import type { CharacterCard } from '../../../sillytavern';

interface CharacterEditorDialogProps {
  character: CharacterCard | null;
  open: boolean;
  onClose: () => void;
  onSave: (character: CharacterCard) => Promise<void>;
}

const fieldDefinitions = [
  ['description', '角色描述', 5],
  ['personality', '性格与语言', 4],
  ['scenario', '当前场景', 4],
  ['firstMessage', '首条消息', 4],
  ['messageExample', '对话示例', 5],
  ['systemPrompt', '系统提示词', 4],
  ['postHistoryInstructions', '历史后置指令', 4],
  ['creatorNotes', '创建者备注', 3],
] as const;

export function createBlankCharacter(): CharacterCard {
  const now = Date.now();
  return {
    id: crypto.randomUUID(), name: '', description: '', personality: '', scenario: '', firstMessage: '',
    messageExample: '', creatorNotes: '', systemPrompt: '', postHistoryInstructions: '', alternateGreetings: [],
    tags: [], creator: '', characterVersion: '1.0', extensions: {}, createdAt: now, updatedAt: now,
  };
}

export function CharacterEditorDialog({ character, open, onClose, onSave }: CharacterEditorDialogProps) {
  const [draft, setDraft] = useState<CharacterCard>(() => character ?? createBlankCharacter());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(character ? structuredClone(character) : createBlankCharacter());
      setError('');
    }
  }, [character, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError('角色名称不能为空');
      return;
    }
    await onSave({ ...draft, name: draft.name.trim(), updatedAt: Date.now() });
    onClose();
  };

  return (
    <Dialog id="character-editor-dialog" title={character ? '编辑角色卡' : '新建角色卡'} open={open} onClose={onClose} eyebrow="CHARACTER CARD / V2">
      <form className="tavern-editor-form" onSubmit={submit}>
        <div className="tavern-editor-lead">
          <label htmlFor="character-editor-name">角色名称</label>
          <input id="character-editor-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          <span>该名称将作为当前 LLM 叙事身份注入提示词。</span>
        </div>
        <div className="tavern-editor-grid">
          <label htmlFor="character-editor-avatar">头像 URL 或数据地址<input id="character-editor-avatar" value={draft.avatar ?? ''} onChange={(event) => setDraft({ ...draft, avatar: event.target.value })} /></label>
          <label htmlFor="character-editor-creator">创建者<input id="character-editor-creator" value={draft.creator} onChange={(event) => setDraft({ ...draft, creator: event.target.value })} /></label>
          <label htmlFor="character-editor-version">角色版本<input id="character-editor-version" value={draft.characterVersion} onChange={(event) => setDraft({ ...draft, characterVersion: event.target.value })} /></label>
          <label htmlFor="character-editor-tags">标签，使用逗号分隔<input id="character-editor-tags" value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: splitList(event.target.value) })} /></label>
        </div>
        {fieldDefinitions.map(([field, label, rows]) => (
          <label key={field} htmlFor={`character-editor-${field}`}>{label}<textarea id={`character-editor-${field}`} rows={rows} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /></label>
        ))}
        <label htmlFor="character-editor-greetings">备用开场白，每行一条<textarea id="character-editor-greetings" rows={4} value={draft.alternateGreetings.join('\n')} onChange={(event) => setDraft({ ...draft, alternateGreetings: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean) })} /></label>
        {error ? <p className="tavern-form-error" role="alert">{error}</p> : null}
        <div className="tavern-editor-actions"><button id="character-editor-cancel" className="terminal-button" type="button" onClick={onClose}>取消</button><button id="character-editor-save" className="terminal-button is-primary" type="submit">保存角色卡</button></div>
      </form>
    </Dialog>
  );
}

function splitList(value: string) {
  return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
}
