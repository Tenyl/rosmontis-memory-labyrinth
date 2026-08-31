import {
  History as ClockCounterClockwise,
  CircleAlert as WarningCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTavern } from '../runtime/useTavern';
import './provenance.css';

interface ProvenanceLinkProps {
  sessionId?: string;
  messageId?: string;
  matchedLorebookEntryIds?: string[];
  idSuffix: string;
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function ProvenanceLink({ sessionId, messageId, matchedLorebookEntryIds, idSuffix }: ProvenanceLinkProps) {
  const { chats } = useTavern();
  if (!sessionId || !messageId) return null;
  const session = chats.find((chat) => chat.id === sessionId);
  const id = `tavern-provenance-${safeId(idSuffix)}`;

  if (!session) {
    return (
      <span id={id} className="tavern-provenance is-unavailable" title="来源会话已被删除或尚未恢复">
        <WarningCircle size={14} aria-hidden />来源会话不可用
      </span>
    );
  }

  return (
    <Link
      id={id}
      className="tavern-provenance"
      to={`/game?session=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(messageId)}`}
      aria-label={`打开来自会话${session.name}的来源回合`}
    >
      <ClockCounterClockwise size={14} aria-hidden />来自会话 / 回合<span>{session.name} · {messageId.slice(-6).toUpperCase()}{matchedLorebookEntryIds?.length ? ` · 世界书证据 ${matchedLorebookEntryIds.length}` : ''}</span>
    </Link>
  );
}
