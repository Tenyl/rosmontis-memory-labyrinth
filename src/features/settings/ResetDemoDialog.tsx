import {
  RotateCcw as ArrowCounterClockwise,
  Database,
  TriangleAlert as WarningDiamond,
} from 'lucide-react';
import { Dialog } from '../../components/Dialog';

interface ResetDemoDialogProps { open: boolean; onClose: () => void; onConfirm: () => void; }

export function ResetDemoDialog({ open, onClose, onConfirm }: ResetDemoDialogProps) {
  return <Dialog id="settings-reset-dialog" title="确认恢复演示" eyebrow="LOCAL DATA / DESTRUCTIVE" open={open} danger onClose={onClose} footer={<><button id="settings-reset-cancel" className="terminal-button is-secondary" type="button" onClick={onClose}>取消</button><button id="settings-reset-confirm" className="terminal-button is-primary" type="button" onClick={onConfirm}>确认恢复<ArrowCounterClockwise size={16} aria-hidden /></button></>}>
    <div className="reset-dialog-content"><div className="reset-warning"><WarningDiamond size={30} aria-hidden /><div><strong>当前游戏进度将被覆盖</strong><p>此操作只影响当前浏览器中的本地数据，不会连接或修改任何后端服务。</p></div></div><section><h3><Database size={17} aria-hidden />将恢复以下内容</h3><ul><li>当前 Run 进度与迷宫拓扑</li><li>迷迭香稳定性、过载与巨剑状态</li><li>记忆图鉴、手记草稿与行动记录</li><li>酒馆会话与本地内容配置</li><li>界面偏好与通知队列</li></ul></section></div>
  </Dialog>;
}
