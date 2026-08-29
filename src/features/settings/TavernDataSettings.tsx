import {
  Archive as ArchiveBox,
  ArrowCounterClockwise,
  ChatsCircle,
  Database,
  DownloadSimple,
  ShieldCheck,
  UploadSimple,
  WarningDiamond,
} from '@phosphor-icons/react';
import { useState, type ChangeEvent } from 'react';
import { Dialog } from '../../components/Dialog';
import {
  exportTavernBackup,
  importTavernBackup,
  parseTavernBackup,
  type TavernBackup,
} from '../../sillytavern/backup';
import { clearAllData, DB_VERSION } from '../../sillytavern/database';
import { exportToJson } from '../../sillytavern/importer';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';

export function TavernDataSettings() {
  const runtime = useTavern();
  const addNotification = useGameStore((state) => state.addNotification);
  const resetDemoState = useGameStore((state) => state.resetDemoState);
  const [preview, setPreview] = useState<TavernBackup | null>(null);
  const [importError, setImportError] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [working, setWorking] = useState(false);

  const exportBackup = async () => {
    try {
      const backup = await exportTavernBackup();
      const date = new Date(backup.exportedAt).toISOString().slice(0, 10);
      exportToJson(backup, `rhodes-tavern-backup-${date}.json`);
      addNotification({ id: 'notification-backup-exported', kind: 'success', title: '备份已导出', message: '已生成不含 API 密钥的版本化 JSON 备份。', dismissible: true });
    } catch (error) {
      addNotification({ id: 'notification-backup-export-failed', kind: 'danger', title: '备份导出失败', message: error instanceof Error ? error.message : '无法读取本地酒馆数据。', dismissible: true });
    }
  };
  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = parseTavernBackup(JSON.parse(await file.text()));
      setPreview(parsed);
      setImportError('');
    } catch (error) {
      setPreview(null);
      setImportError(error instanceof Error ? error.message : '备份文件无法解析');
    }
  };
  const applyImport = async () => {
    if (!preview) return;
    setWorking(true);
    try {
      await importTavernBackup(preview);
      await runtime.reload();
      setPreview(null);
      addNotification({ id: 'notification-backup-imported', kind: 'success', title: '备份已恢复', message: '角色、身份、世界书、预设、会话与变量已写入本地数据库。', dismissible: true });
    } finally {
      setWorking(false);
    }
  };
  const clearChats = async () => {
    setWorking(true);
    await runtime.clearChats();
    setClearOpen(false);
    setWorking(false);
    addNotification({ id: 'notification-chats-cleared', kind: 'success', title: '会话已清理', message: '角色、身份、世界书、预设与接口设置已保留。', dismissible: true });
  };
  const restoreDefaults = async () => {
    setWorking(true);
    await clearAllData();
    resetDemoState();
    await runtime.reload();
    setRestoreOpen(false);
    setWorking(false);
    addNotification({ id: 'notification-tavern-restored', kind: 'success', title: '酒馆默认内容已恢复', message: '雨幕回声会话、迷迭香角色卡与罗德岛预设已重建。', dismissible: true });
  };

  return (
    <section id="settings-panel-data" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-data">
      <header className="settings-workspace-heading"><div><span className="panel-code">INDEXEDDB / VERSION {DB_VERSION}</span><h2>本地数据</h2><p>管理完整备份、会话生命周期与默认内容。所有操作都在当前浏览器中完成。</p></div><span className="settings-mode-indicator is-local"><Database size={18} aria-hidden />LOCAL ONLY</span></header>
      {importError ? <p className="settings-import-error" role="alert"><WarningDiamond size={17} aria-hidden />{importError}</p> : null}
      <div className="settings-data-grid">
        <article><div className="settings-data-icon"><ArchiveBox size={24} aria-hidden /></div><div><span className="panel-code">FULL SNAPSHOT</span><h3>完整酒馆备份</h3><p>导出角色、身份、世界书、预设、会话、变量与设置。API 密钥始终从文件中移除。</p><dl><div><dt>会话</dt><dd>{runtime.chats.length}</dd></div><div><dt>角色 / 身份</dt><dd>{runtime.characters.length + runtime.personas.length}</dd></div><div><dt>世界书 / 预设</dt><dd>{runtime.lorebooks.length + runtime.presets.length}</dd></div></dl></div><footer><button id="settings-backup-export" className="terminal-button" type="button" onClick={() => void exportBackup()}><DownloadSimple size={17} aria-hidden />导出完整备份</button><label className="terminal-button is-primary" htmlFor="settings-backup-import"><UploadSimple size={17} aria-hidden />选择备份文件</label><input id="settings-backup-import" className="visually-hidden" type="file" accept=".json,application/json" aria-label="导入酒馆完整备份" onChange={(event) => void readImport(event)} /></footer></article>
        <article><div className="settings-data-icon"><ChatsCircle size={24} aria-hidden /></div><div><span className="panel-code">CHAT LIFECYCLE</span><h3>仅清理会话</h3><p>删除所有消息、分支和变量快照，但保留角色卡、世界书、生成预设与接口配置。</p></div><footer><button id="settings-clear-chats-open" className="terminal-button is-danger" type="button" onClick={() => setClearOpen(true)}><ChatsCircle size={17} aria-hidden />清理全部会话</button></footer></article>
        <article className="is-danger"><div className="settings-data-icon"><ArrowCounterClockwise size={24} aria-hidden /></div><div><span className="panel-code">FACTORY CONTENT</span><h3>恢复酒馆默认内容</h3><p>清除全部酒馆数据并重建默认角色、身份、世界书、预设和“雨幕回声”会话。该操作与清理会话分开。</p></div><footer><button id="settings-tavern-restore-open" className="terminal-button is-danger" type="button" onClick={() => setRestoreOpen(true)}><ArrowCounterClockwise size={17} aria-hidden />恢复默认内容</button></footer></article>
      </div>
      <div className="settings-security-banner"><ShieldCheck size={22} weight="fill" aria-hidden /><div><strong>本地安全边界</strong><p>普通备份不包含主接口或次级接口密钥；恢复备份后需在“接口连接”重新填写凭据。</p></div></div>

      <Dialog id="settings-backup-preview-dialog" title="备份导入预览" open={Boolean(preview)} onClose={() => setPreview(null)} eyebrow="VALIDATED BACKUP / PREVIEW" footer={<><button id="settings-backup-import-cancel" className="terminal-button" type="button" onClick={() => setPreview(null)}>取消导入</button><button id="settings-backup-import-confirm" className="terminal-button is-primary" type="button" disabled={working} onClick={() => void applyImport()}>确认恢复备份</button></>}><div className="settings-backup-preview"><p>文件版本与当前数据库匹配。确认后将替换现有酒馆数据，API 密钥不会被导入。</p><ul><li>会话 {preview?.chats.length ?? 0}</li><li>角色 {preview?.characters.length ?? 0}</li><li>玩家身份 {preview?.personas.length ?? 0}</li><li>世界书 {preview?.lorebooks.length ?? 0}</li><li>预设 {preview?.presets.length ?? 0}</li></ul></div></Dialog>
      <Dialog id="settings-clear-chats-dialog" title="确认清理会话" open={clearOpen} onClose={() => setClearOpen(false)} danger footer={<><button className="terminal-button" type="button" onClick={() => setClearOpen(false)}>取消</button><button id="settings-clear-chats-confirm" className="terminal-button is-danger" type="button" disabled={working} onClick={() => void clearChats()}>确认清理</button></>}><p>将删除 {runtime.chats.length} 个会话及全部分支、消息与变量快照。角色、世界书、预设和设置不受影响。</p></Dialog>
      <Dialog id="settings-restore-tavern-dialog" title="确认恢复酒馆默认内容" open={restoreOpen} onClose={() => setRestoreOpen(false)} danger footer={<><button className="terminal-button" type="button" onClick={() => setRestoreOpen(false)}>取消</button><button id="settings-restore-tavern-confirm" className="terminal-button is-danger" type="button" disabled={working} onClick={() => void restoreDefaults()}>确认恢复</button></>}><p>此操作会覆盖当前酒馆数据库。如需保留自定义内容，请先导出完整备份。</p></Dialog>
    </section>
  );
}
