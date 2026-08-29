import { BookOpenText, Database, Pulse } from '@phosphor-icons/react';
import type { MatchedEntry } from '../../../sillytavern';
import type { TavernRuntimeStatus } from '../runtime/TavernProvider';

const labels: Record<TavernRuntimeStatus, string> = { booting: '正在恢复', ready: '待命', assembling: '编排上下文', streaming: '接收数据流', paused: '已暂停', complete: '回合完成', interrupted: '链路中断', failed: '链路异常' };
export function TurnTelemetry({ status, matches, variables }: { status: TavernRuntimeStatus; matches: MatchedEntry[]; variables: number }) { return <div className="tavern-turn-telemetry" aria-live="polite"><span className={`is-${status}`}><Pulse size={15} weight="fill" aria-hidden />{labels[status]}</span><span><BookOpenText size={15} aria-hidden />{matches.length} 条世界书命中</span><span><Database size={15} aria-hidden />{variables} 个变量</span></div>; }
