import type { RunMode } from '../../game/types';
import type { DirectorNovelRecord } from '../../llm/directorState';

interface NovelMazeBriefProps {
  mode: RunMode;
  novel: DirectorNovelRecord | null;
}

export function NovelMazeBrief({ mode, novel }: NovelMazeBriefProps) {
  if (mode !== 'novel' || !novel) return null;
  return (
    <section
      id="novel-maze-brief"
      className="novel-maze-brief"
      role="region"
      aria-labelledby="novel-maze-brief-title"
    >
      <header>
        <div>
          <span>NOVEL DIRECTOR / THEMATIC BRIEF</span>
          <h2 id="novel-maze-brief-title">小说迷宫简报</h2>
        </div>
        <strong>{novel.source === 'remote' ? '远程生成' : '本地回退'}</strong>
      </header>
      <div className="novel-maze-brief-body">
        <div>
          <small>本层标题</small>
          <h3>{novel.content.title}</h3>
          <p>{novel.content.premise}</p>
        </div>
        <dl>
          <div><dt>主题</dt><dd>{novel.content.theme}</dd></div>
          <div><dt>通关钩子</dt><dd>{novel.content.endingHook}</dd></div>
        </dl>
      </div>
    </section>
  );
}
