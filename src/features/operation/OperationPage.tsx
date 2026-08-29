import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { TavernGameView } from '../tavern/game/TavernGameView';
import { TacticalOverview } from './TacticalOverview';
import './operation.css';

export default function OperationPage() {
  const session = useGameStore((state) => state.session);
  const rosmontis = useGameStore((state) => state.operators.byId.rosmontis);

  return (
    <section className="route-page operation-route" aria-labelledby="operation-page-title">
      <PageHeader
        id="operation-page-title"
        code="01"
        title="作战主控台"
        description="解析剧情、执行战术指令并监控迷迭香状态。所有本地模拟与远程模型回合均经统一 Tavern 运行时解析并持久化。"
        meta="LIVE SESSION / 03:31"
      />

      <div className="operation-workbench">
        <div className="operation-primary">
          <TavernGameView />
        </div>
        <TacticalOverview session={session} rosmontis={rosmontis} />
      </div>
    </section>
  );
}
