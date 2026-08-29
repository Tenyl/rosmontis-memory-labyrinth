import type {
  MemoryLayer,
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
const MEMORY_LAYERS = new Set<MemoryLayer>(['表层记忆', '深层潜意识', '未知战局']);

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

function memoryLayer(value: unknown): MemoryLayer | null {
  return typeof value === 'string' && MEMORY_LAYERS.has(value as MemoryLayer)
    ? value as MemoryLayer
    : null;
}

function stringList(value: unknown): string[] | null {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string' ? value.split(/[\n,，;；]/) : [];
  const normalized = items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length ? normalized : null;
}

function changed(key: string, input: TavernTurnProjectionInput) {
  return !Object.is(input.variables[key], input.previousVariables[key]);
}

function optional<T extends object, K extends string, V>(target: T, key: K, value: V | null): T & Partial<Record<K, V>> {
  if (value === null) return target;
  return Object.assign(target, { [key]: value });
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

  const memoryTitle = text(input.variables.memory_node_title);
  if (memoryTitle && changed('memory_node_title', input)) {
    let event: Extract<TacticalDomainEvent, { type: 'memory.node.discovered' }> = {
      type: 'memory.node.discovered',
      title: memoryTitle,
      risk: risk(input.variables.memory_node_risk) ?? 'C',
      sourceMessageId,
    };
    event = optional(event, 'summary', text(input.variables.memory_node_summary));
    event = optional(event, 'layer', memoryLayer(input.variables.memory_node_layer));
    event = optional(event, 'hostileCount', bounded(input.variables.memory_node_hostiles, 0, 99));
    event = optional(event, 'alliedCount', bounded(input.variables.memory_node_allies, 0, 99));
    event = optional(event, 'effects', stringList(input.variables.memory_node_effects));
    event = optional(event, 'intelligence', stringList(input.variables.memory_node_intelligence));
    push(event);
  }

  const addArchiveEvent = (prefix: 'clue' | 'npc') => {
    const title = text(input.variables[`${prefix}_title`]);
    if (!title || !changed(`${prefix}_title`, input)) return;
    let event: Extract<TacticalDomainEvent, { type: 'archive.clue.discovered' | 'archive.npc.discovered' }> = {
      type: prefix === 'clue' ? 'archive.clue.discovered' : 'archive.npc.discovered',
      title,
      sourceMessageId,
    };
    event = optional(event, 'summary', text(input.variables[`${prefix}_summary`]));
    event = optional(event, 'confidence', bounded(input.variables[`${prefix}_confidence`]));
    event = optional(event, 'risk', risk(input.variables[`${prefix}_risk`]));
    push(event);
  };
  addArchiveEvent('clue');
  addArchiveEvent('npc');

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
  const summary = text(input.summary);
  if (summary) push({ type: 'log.turn.completed', summary, sourceMessageId });

  return events;
}
