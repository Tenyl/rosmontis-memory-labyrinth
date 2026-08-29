import { ArrowCounterClockwise as RotateCcw, BracketsAngle, FloppyDisk, Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { DEFAULT_FORMAT_PROMPT, DEFAULT_TAGS, type AppSettings } from '../../sillytavern/types';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';

export function TavernParsingSettings() {
  const runtime = useTavern();
  const addNotification = useGameStore((state) => state.addNotification);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (runtime.settings) setDraft(structuredClone(runtime.settings));
  }, [runtime.settings]);

  if (!draft) return <div className="settings-panel-loading" role="status">正在读取解析协议。</div>;

  const updateTag = (index: number, value: string) => {
    const tags = [...draft.customTags];
    tags[index] = value;
    setDraft({ ...draft, customTags: tags });
    setError('');
  };
  const validate = () => {
    const tags = draft.customTags.map((tag) => tag.trim()).filter(Boolean);
    if (!tags.includes('maintext') || !tags.includes('option')) {
      setError('解析标签必须包含 maintext 与 option');
      return null;
    }
    if (new Set(tags).size !== tags.length || tags.some((tag) => !/^[a-z][a-z0-9_-]*$/i.test(tag))) {
      setError('标签必须唯一，且只能使用字母、数字、下划线或连字符');
      return null;
    }
    setError('');
    return tags;
  };
  const save = async () => {
    const tags = validate();
    if (!tags) return;
    const next = { ...draft, customTags: tags, formatPromptTemplate: draft.formatPromptTemplate.trim() || DEFAULT_FORMAT_PROMPT };
    await runtime.updateSettings(next);
    setDraft(next);
    addNotification({ id: 'notification-parsing-saved', kind: 'success', title: '解析协议已保存', message: `${tags.length} 个标签将从下一回合开始参与流式解析。`, dismissible: true });
  };
  const restore = () => {
    setDraft({ ...draft, customTags: [...DEFAULT_TAGS], formatPromptTemplate: DEFAULT_FORMAT_PROMPT });
    setError('');
  };

  return (
    <section id="settings-panel-parsing" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-parsing">
      <header className="settings-workspace-heading"><div><span className="panel-code">STREAM PARSER / XML CONTRACT</span><h2>解析协议</h2><p>将模型输出分解为正文、选项、摘要、变量与思考流。未识别标签仍保留在原始回合中。</p></div><span className="settings-protocol-count"><BracketsAngle size={18} aria-hidden />{String(draft.customTags.length).padStart(2, '0')} TAGS</span></header>
      <div className="settings-parsing-layout">
        <section className="settings-protocol-card" aria-labelledby="settings-tags-title"><header><div><span className="panel-code">TAG REGISTRY</span><h3 id="settings-tags-title">流式标签表</h3></div><button id="settings-tags-restore" className="terminal-button" type="button" onClick={restore}><RotateCcw size={16} aria-hidden />恢复默认六标签</button></header>
          <ol className="settings-tag-list">{draft.customTags.map((tag, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span><label htmlFor={`settings-parser-tag-${index}`}><span className="sr-only">解析标签 {index + 1}</span><input id={`settings-parser-tag-${index}`} aria-label={`解析标签 ${index + 1}`} value={tag} onChange={(event) => updateTag(index, event.target.value)} /></label><code>{tag === 'maintext' ? '剧情正文' : tag === 'option' ? '战术选项' : tag === 'sum' ? '回合摘要' : tag === 'vars' ? '状态变量' : '折叠思考'}</code><button id={`settings-parser-tag-remove-${index}`} type="button" aria-label={`删除解析标签 ${tag || index + 1}`} disabled={draft.customTags.length <= 2} onClick={() => setDraft({ ...draft, customTags: draft.customTags.filter((_, itemIndex) => itemIndex !== index) })}><Trash size={16} aria-hidden /></button></li>)}</ol>
          <button id="settings-parser-tag-add" className="settings-inline-add" type="button" onClick={() => setDraft({ ...draft, customTags: [...draft.customTags, `custom_${draft.customTags.length + 1}`] })}><Plus size={16} aria-hidden />添加自定义标签</button>
          {error ? <p className="settings-field-error" role="alert">{error}</p> : null}
        </section>
        <section className="settings-protocol-card" aria-labelledby="settings-format-title"><header><div><span className="panel-code">OUTPUT INSTRUCTION</span><h3 id="settings-format-title">输出格式指令</h3></div></header>
          <label className="settings-select-field" htmlFor="settings-thinking-display"><span>思考过程显示</span><select id="settings-thinking-display" value={draft.thinkingDisplay} onChange={(event) => setDraft({ ...draft, thinkingDisplay: event.target.value as AppSettings['thinkingDisplay'] })}><option value="fold">默认折叠</option><option value="hide">完全隐藏</option><option value="inline">内联显示</option></select></label>
          <label className="settings-format-field" htmlFor="settings-format-prompt"><span>模型输出约定</span><textarea id="settings-format-prompt" rows={15} value={draft.formatPromptTemplate} onChange={(event) => setDraft({ ...draft, formatPromptTemplate: event.target.value })} /><small>该指令在变量快照之后注入，不替代生成预设中的系统提示词。</small></label>
        </section>
      </div>
      <footer className="settings-workspace-actions"><span>至少保留 maintext 与 option</span><button id="settings-parsing-save" className="terminal-button is-primary" type="button" onClick={() => void save()}><FloppyDisk size={17} aria-hidden />保存解析协议</button></footer>
    </section>
  );
}
