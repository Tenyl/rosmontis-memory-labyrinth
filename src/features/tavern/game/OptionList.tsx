import { ArrowBendDownRight } from '@phosphor-icons/react';

export function OptionList({ options, disabled, onPick }: { options: string[]; disabled: boolean; onPick: (text: string) => void }) {
  if (!options.length) return null;
  return <section className="tavern-options" aria-labelledby="tavern-options-title"><header><span id="tavern-options-title">战术候选行动</span><small>数字键 1—{Math.min(options.length, 9)} 快速填入</small></header><div>{options.map((option, index) => <button id={`tavern-option-${index + 1}`} key={`${option}-${index}`} type="button" disabled={disabled} aria-label={`选择：${option}`} onClick={() => onPick(option)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{option}</strong><ArrowBendDownRight size={17} aria-hidden /></button>)}</div></section>;
}
