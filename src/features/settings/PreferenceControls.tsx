import {
  MoveHorizontal as ArrowsOutLineHorizontal,
  Eye,
  Gauge,
  Save as FloppyDisk,
  CaseUpper as TextAa,
  Wind,
} from 'lucide-react';
import type { UiPreferences } from '../../types/game';

interface PreferenceControlsProps {
  preferences: UiPreferences;
  onChange: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
}

export function PreferenceControls({ preferences, onChange }: PreferenceControlsProps) {
  return (
    <div className="preference-grid">
      <PreferenceGroup icon={<ArrowsOutLineHorizontal size={19} aria-hidden />} title="信息密度" description="调整卡片间距和单屏信息量。" name="density" value={preferences.density} options={[['comfortable','舒展'],['standard','标准'],['compact','紧凑']]} onChange={(value) => onChange('density', value as UiPreferences['density'])} />
      <PreferenceGroup icon={<Gauge size={19} aria-hidden />} title="文本生成速度" description="控制本地叙事文本的呈现节奏。" name="text-speed" value={preferences.textSpeed} options={[['instant','即时'],['standard','标准'],['immersive','沉浸式']]} onChange={(value) => onChange('textSpeed', value as UiPreferences['textSpeed'])} />
      <PreferenceGroup icon={<Wind size={19} aria-hidden />} title="界面动效" description="减少动效会停用位移与持续脉冲。" name="motion" value={preferences.motion} options={[['full','完整动效'],['reduced','减少动效'],['system','跟随系统']]} onChange={(value) => onChange('motion', value as UiPreferences['motion'])} />
      <PreferenceGroup icon={<TextAa size={19} aria-hidden />} title="界面字号" description="放大叙事文本和战术数据标签。" name="font-size" value={preferences.fontSize} options={[['standard','标准字号'],['large','大字号'],['xlarge','特大字号']]} onChange={(value) => onChange('fontSize', value as UiPreferences['fontSize'])} />
      <SwitchPreference id="settings-high-contrast" icon={<Eye size={19} aria-hidden />} title="高对比模式" description="强化边框、主文本和状态色之间的区分。" checked={preferences.highContrast} onChange={(value) => onChange('highContrast', value)} />
      <SwitchPreference id="settings-autosave" icon={<FloppyDisk size={19} aria-hidden />} title="自动保存进度" description="在每次状态变化后写入浏览器本地存储。" checked={preferences.autosave} onChange={(value) => onChange('autosave', value)} />
    </div>
  );
}

function PreferenceGroup({ icon, title, description, name, value, options, onChange }: { icon: React.ReactNode; title: string; description: string; name: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return <fieldset className="preference-card"><legend className="sr-only">{title}</legend><header>{icon}<div><h2>{title}</h2><p>{description}</p></div></header><div className="preference-options">{options.map(([optionValue,label]) => <label key={optionValue} className={value === optionValue ? 'is-selected' : ''}><input id={`settings-${name}-${optionValue}`} type="radio" name={`settings-${name}`} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} /><span>{label}</span><i aria-hidden="true" /></label>)}</div></fieldset>;
}

function SwitchPreference({ id, icon, title, description, checked, onChange }: { id: string; icon: React.ReactNode; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <section className="preference-card is-switch"><header>{icon}<div><h2>{title}</h2><p>{description}</p></div></header><label htmlFor={id} className="terminal-switch"><input id={id} type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{checked ? '已启用' : '已停用'}</span><i aria-hidden="true" /></label></section>;
}
