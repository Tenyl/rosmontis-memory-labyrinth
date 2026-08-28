import { IdentificationCard, UsersThree } from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useGameStore } from '../../store/gameStore';
import type { Operator } from '../../types/game';
import { OperatorDialog } from './OperatorDialog';
import { RosmontisProfile } from './RosmontisProfile';
import { SquadRoster } from './SquadRoster';
import { CharacterManager } from '../tavern/characters/CharacterManager';
import './operators.css';

export default function OperatorsPage() {
  const operatorsState = useGameStore((state) => state.operators);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [workspace, setWorkspace] = useState<'squad' | 'identities'>('squad');
  const rosmontis = operatorsState.byId.rosmontis;
  const squad = operatorsState.squadOrder.slice(1).map((id) => operatorsState.byId[id]).filter(Boolean);

  return (
    <section className="route-page operators-route" aria-labelledby="operators-page-title">
      <PageHeader
        id="operators-page-title"
        code="03"
        title="干员与小队"
        description="读取迷迭香的跑团属性、意识医疗监测与战术能力，并追踪所有随行干员的本回合状态。"
        meta="4 ONLINE / FORMATION A"
        actions={<StatusBadge label="小队链路正常" tone="success" />}
      />
      <div className="operators-view-tabs" role="tablist" aria-label="干员工作区视图">
        <button id="operators-view-squad" type="button" role="tab" aria-selected={workspace === 'squad'} onClick={() => setWorkspace('squad')}><UsersThree size={17} aria-hidden />战术小队</button>
        <button id="tavern-tab-characters" type="button" role="tab" aria-selected={workspace === 'identities'} onClick={() => setWorkspace('identities')}><IdentificationCard size={17} aria-hidden />角色与身份</button>
      </div>
      {workspace === 'squad' ? <div className="operators-stack">
        {rosmontis ? <RosmontisProfile operator={rosmontis} /> : null}
        <SquadRoster operators={squad} formation={operatorsState.formation} onOpen={setSelectedOperator} />
      </div> : <CharacterManager />}
      <OperatorDialog operator={selectedOperator} onClose={() => setSelectedOperator(null)} />
    </section>
  );
}
