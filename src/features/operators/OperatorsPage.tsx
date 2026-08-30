import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useGameStore } from '../../store/gameStore';
import { RosmontisProfile } from './RosmontisProfile';
import './operators.css';

export default function OperatorsPage() {
  const operatorsState = useGameStore((state) => state.operators);
  const rosmontis = operatorsState.byId.rosmontis;

  return (
    <section className="route-page operators-route" aria-labelledby="operators-page-title">
      <PageHeader
        id="operators-page-title"
        code="03"
        title="迷迭香状态"
        description="读取迷迭香的跑团属性、意识医疗监测与战术能力，维持单人认知潜入链路。"
        meta="RSM-04 / SINGLE LINK"
        actions={<StatusBadge label="认知链路稳定" tone="success" />}
      />
      <div className="operators-stack">
        {rosmontis ? <RosmontisProfile operator={rosmontis} /> : null}
      </div>
    </section>
  );
}
