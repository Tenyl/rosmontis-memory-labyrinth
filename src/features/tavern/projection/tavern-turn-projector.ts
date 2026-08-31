import type {
  RiskLevel,
  TacticalDomainEvent,
} from '../../../types/game';

export interface TavernTurnProjectionInput {
  sessionId: string;
  messageId: string;
  summary: string;
  variables: Record<string, unknown>;
  previousVariables: Record<string, unknown>;
  matchedLorebookEntryIds?: string[];
}

const RISK_LEVELS = new Set<RiskLevel>(['D', 'C', 'B', 'A', 'S']);

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function number(value: unknown): number | null {
  const normalized = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(normalized) ? normalized : null;
}

function bounded(value: unknown, minimum = 0, maximum = 100): number | null {
  const normalized = number(value);
  return normalized === null ? null : Math.min(maximum, Math.max(minimum, normalized));
}

function risk(value: unknown): RiskLevel | null {
  return typeof value === 'string' && RISK_LEVELS.has(value as RiskLevel)
    ? value as RiskLevel
    : null;
}

function changed(key: string, input: TavernTurnProjectionInput) {
  return !Object.is(input.variables[key], input.previousVariables[key]);
}

export function projectTavernTurn(input: TavernTurnProjectionInput): TacticalDomainEvent[] {
  if (!input.sessionId.trim() || !input.messageId.trim()) return [];
  const events: TacticalDomainEvent[] = [];
  const sourceMessageId = input.messageId;
  const matchedLorebookEntryIds = [...new Set(input.matchedLorebookEntryIds?.filter(Boolean) ?? [])];
  const push = (event: TacticalDomainEvent) => {
    events.push(matchedLorebookEntryIds.length ? { ...event, matchedLorebookEntryIds } : event);
  };

  const stress = bounded(input.variables.rosmontis_stress);
  if (stress !== null && changed('rosmontis_stress', input)) {
    push({ type: 'operator.stress.changed', operatorId: 'rosmontis', value: stress, sourceMessageId });
  }

  const sanity = bounded(input.variables.sanity ?? input.variables.rosmontis_sanity);
  const previousSanity = input.variables.sanity !== undefined ? 'sanity' : 'rosmontis_sanity';
  if (sanity !== null && changed(previousSanity, input)) {
    push({ type: 'operator.sanity.changed', operatorId: 'rosmontis', value: sanity, sourceMessageId });
  }

  const globalRisk = risk(input.variables.risk);
  if (globalRisk && changed('risk', input)) {
    push({ type: 'session.risk.changed', value: globalRisk, sourceMessageId });
  }
  const objective = text(input.variables.objective);
  if (objective && changed('objective', input)) {
    push({ type: 'session.objective.changed', value: objective, sourceMessageId });
  }
  const squadStatus = text(input.variables.squad_status);
  if (squadStatus && changed('squad_status', input)) {
    push({ type: 'squad.status.changed', value: squadStatus, sourceMessageId });
  }
  return events;
}
