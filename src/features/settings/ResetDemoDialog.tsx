import { ArrowCounterClockwise, Database, WarningDiamond } from '@phosphor-icons/react';
import { Dialog } from '../../components/Dialog';

interface ResetDemoDialogProps { open: boolean; onClose: () => void; onConfirm: () => void; }

export function ResetDemoDialog({ open, onClose, onConfirm }: ResetDemoDialogProps) {
  return <Dialog id="settings-reset-dialog" title="确认恢复演示" eyebrow="LOCAL DATA / DESTRUCTIVE" open={open} danger onClose={onClose} footer={<><button id="settings-reset-cancel" className="terminal-button is-secondary" type="button" onClick={onClose}>取消</button><button id="settings-reset-confirm" className="terminal-button is-primary" type="button" onClick={onConfirm}>确认恢复<ArrowCounterClockwise size={16} weight="bold" aria-hidden /></button></>}>
    <div className="reset-dialog-content"><div className="reset-warning"><WarningDiamond size={30} weight="fill" aria-hidden /><div><strong>当前演示进度将被覆盖</strong><p>此操作只影响当前浏览器中的原型数据，不会连接或修改任何后端服务。</p></div></div><section><h3><Database size={17} aria-hidden />将恢复以下内容</h3><ul><li>剧情文本流与玩家指令草稿</li><li>意识节点、路径拓建与当前选择</li><li>迷迭香精神负荷与认知链路状态</li><li>情报钉选、玩家批注与关系图</li><li>界面偏好与通知队列</li></ul></section></div>
  </Dialog>;
}
