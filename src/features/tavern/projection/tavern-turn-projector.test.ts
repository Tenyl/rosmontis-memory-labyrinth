import { describe, expect, it } from 'vitest';
import { projectTavernTurn } from './tavern-turn-projector';

describe('projectTavernTurn', () => {
  it('projects a completed turn into operator, memory, archive and log events', () => {
    expect(projectTavernTurn({
      sessionId: 'chat-rain',
      messageId: 'msg-9',
      summary: '发现儿童意识回声',
      variables: {
        rosmontis_stress: 47,
        memory_node_title: '沉没诊疗层',
        memory_node_risk: 'A',
        clue_title: '被涂改的病历',
      },
      previousVariables: { rosmontis_stress: 39 },
    })).toEqual([
      { type: 'operator.stress.changed', operatorId: 'rosmontis', value: 47, sourceMessageId: 'msg-9' },
      { type: 'memory.node.discovered', title: '沉没诊疗层', risk: 'A', sourceMessageId: 'msg-9' },
      { type: 'archive.clue.discovered', title: '被涂改的病历', sourceMessageId: 'msg-9' },
      { type: 'log.turn.completed', summary: '发现儿童意识回声', sourceMessageId: 'msg-9' },
    ]);
  });

  it('clamps valid medical metrics and ignores invalid tactical values', () => {
    expect(projectTavernTurn({
      sessionId: 'chat-rain',
      messageId: 'msg-10',
      summary: ' ',
      variables: {
        rosmontis_stress: 140,
        sanity: -12,
        memory_node_title: '  ',
        memory_node_risk: 'SS',
        clue_title: 9,
        risk: 'D',
        objective: '回收认知锚点',
        unknown_private_value: 'kept in chat only',
      },
      previousVariables: { rosmontis_stress: 39, sanity: 62 },
    })).toEqual([
      { type: 'operator.stress.changed', operatorId: 'rosmontis', value: 100, sourceMessageId: 'msg-10' },
      { type: 'operator.sanity.changed', operatorId: 'rosmontis', value: 0, sourceMessageId: 'msg-10' },
      { type: 'session.risk.changed', value: 'D', sourceMessageId: 'msg-10' },
      { type: 'session.objective.changed', value: '回收认知锚点', sourceMessageId: 'msg-10' },
    ]);
  });

  it('creates an NPC event with optional validated evidence', () => {
    expect(projectTavernTurn({
      sessionId: 'chat-rain',
      messageId: 'msg-11',
      summary: '未知通讯接入',
      variables: {
        npc_title: '护理员伊莲',
        npc_summary: '镜面中没有投影。',
        npc_confidence: 43,
        npc_risk: 'A',
        squad_status: '神经链路稳定',
      },
      previousVariables: {},
    })).toEqual([
      {
        type: 'archive.npc.discovered',
        title: '护理员伊莲',
        summary: '镜面中没有投影。',
        confidence: 43,
        risk: 'A',
        sourceMessageId: 'msg-11',
      },
      { type: 'squad.status.changed', value: '神经链路稳定', sourceMessageId: 'msg-11' },
      { type: 'log.turn.completed', summary: '未知通讯接入', sourceMessageId: 'msg-11' },
    ]);
  });
});
