import {
  Radio as Broadcast,
  MessageSquareText as ChatCenteredText,
} from 'lucide-react';

export function MainTextPane({ text, isStreaming, sequence }: { text: string; isStreaming: boolean; sequence: number }) {
  return <article className={`tavern-maintext${isStreaming ? ' is-streaming' : ''}`} aria-label="剧情正文"><div className="tavern-maintext-rail" aria-hidden="true"><span>{String(sequence).padStart(2, '0')}</span><i>{isStreaming ? <Broadcast size={16} /> : <ChatCenteredText size={16} />}</i></div><div className="tavern-maintext-copy"><header><span>{isStreaming ? 'LIVE GENERATION' : 'ASSISTANT / NARRATIVE'}</span><small>{isStreaming ? '数据流接收中' : '回合记录已固化'}</small></header><p>{text || (isStreaming ? '正在建立叙事上下文……' : '尚未收到本回合正文。')}{isStreaming ? <span className="stream-cursor" aria-hidden="true" /> : null}</p></div></article>;
}
