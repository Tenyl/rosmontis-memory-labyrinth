import { MagnifyingGlass, Sparkle } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { createLorebookEngine, type Lorebook } from '../../../sillytavern';

export function KeywordPreview({ lorebook }: { lorebook: Lorebook }) {
  const [sample, setSample] = useState('雨幕覆盖切尔诺伯格废墟，迷迭香感知到异常源石回响。');
  const matches = useMemo(() => createLorebookEngine(lorebook, () => 0).recursiveScan(sample), [lorebook, sample]);
  return <section className="tavern-trigger-preview" aria-labelledby="lorebook-preview-title"><header><Sparkle size={17} aria-hidden /><div><strong id="lorebook-preview-title">触发演算预览</strong><span>真实 LorebookEngine 扫描结果</span></div></header><label htmlFor="lorebook-preview-input"><MagnifyingGlass size={16} aria-hidden /><span className="visually-hidden">测试文本</span><input id="lorebook-preview-input" value={sample} onChange={(event) => setSample(event.target.value)} /></label><div className="tavern-preview-results">{matches.length ? matches.map((match, index) => <article key={match.entry.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{match.entry.comment || match.entry.keys.join(' / ') || '常驻条目'}</strong><p>{match.matchedKeywords.join(' / ')} · ORDER {match.entry.order}</p></div></article>) : <p>当前文本未触发任何条目。</p>}</div></section>;
}
