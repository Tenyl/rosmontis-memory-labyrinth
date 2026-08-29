import {
  CheckCircle,
  Eye,
  EyeSlash,
  FloppyDisk,
  PlugsConnected,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { testConnection } from '../../sillytavern/api-tools';
import type { ApiSettings, AppSettings } from '../../sillytavern/types';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';

type FieldErrors = Partial<Record<'baseUrl' | 'model' | 'secondaryBaseUrl' | 'secondaryModel', string>>;

function normalizeEndpoint(value: string) {
  return value.replace(/\/+$/, '');
}

export function TavernConnectionSettings() {
  const runtime = useTavern();
  const addNotification = useGameStore((state) => state.addNotification);
  const [draft, setDraft] = useState<AppSettings | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPrimaryKey, setShowPrimaryKey] = useState(false);
  const [showSecondaryKey, setShowSecondaryKey] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (runtime.settings) setDraft(structuredClone(runtime.settings));
  }, [runtime.settings]);

  if (!draft) return <div className="settings-panel-loading" role="status">正在读取本地接口配置。</div>;

  const secondary = draft.api.secondary ?? { enabled: false, baseUrl: '', apiKey: '', model: '' };
  const setPrimary = <K extends keyof ApiSettings>(key: K, value: ApiSettings[K]) => {
    setDraft((current) => current ? { ...current, api: { ...current.api, [key]: value } } : current);
  };
  const setSecondary = (key: keyof NonNullable<ApiSettings['secondary']>, value: string | number | boolean) => {
    setDraft((current) => current ? {
      ...current,
      api: { ...current.api, secondary: { ...secondary, [key]: value } },
    } : current);
  };
  const validate = (field: keyof FieldErrors) => {
    const value = field === 'baseUrl' ? draft.api.baseUrl
      : field === 'model' ? draft.api.model
      : field === 'secondaryBaseUrl' ? secondary.baseUrl
      : secondary.model;
    const enabled = !field.startsWith('secondary') || secondary.enabled;
    const message = !enabled || value.trim()
      ? ''
      : field === 'baseUrl' ? '请输入 API 基础 URL'
      : field === 'model' ? '请输入模型名称'
      : field === 'secondaryBaseUrl' ? '请输入次级接口 URL'
      : '请输入次级模型名称';
    setErrors((current) => ({ ...current, [field]: message || undefined }));
    return !message;
  };
  const validateAll = () => {
    const results = (['baseUrl', 'model', 'secondaryBaseUrl', 'secondaryModel'] as const).map(validate);
    return results.every(Boolean);
  };

  const save = async () => {
    if (!validateAll()) return;
    const next: AppSettings = {
      ...draft,
      apiMode: secondary.enabled ? 'dual' : 'single',
      api: {
        ...draft.api,
        baseUrl: normalizeEndpoint(draft.api.baseUrl),
        model: draft.api.model.trim(),
        secondary: {
          ...secondary,
          baseUrl: normalizeEndpoint(secondary.baseUrl),
          model: secondary.model.trim(),
        },
      },
    };
    await runtime.updateSettings(next);
    setDraft(next);
    addNotification({ id: 'notification-api-settings-saved', kind: 'success', title: '接口配置已保存', message: next.api.apiKey.trim() ? '远程模型将在下一回合生效。' : '未保存主接口密钥，系统保持本地模拟。', dismissible: true });
  };

  const runTest = async () => {
    if (!validate('baseUrl') || !validate('model')) return;
    if (!draft.api.apiKey.trim()) {
      addNotification({ id: 'notification-api-test-failed', kind: 'danger', title: '接口连接失败', message: '请先填写 API 密钥；密钥不会出现在错误详情中。', dismissible: true });
      return;
    }
    setTesting(true);
    const result = await testConnection({ baseUrl: normalizeEndpoint(draft.api.baseUrl), apiKey: draft.api.apiKey, model: draft.api.model });
    setTesting(false);
    if (result.ok) {
      addNotification({ id: 'notification-api-test-success', kind: 'success', title: '接口连接成功', message: `主接口已响应${result.status ? `（HTTP ${result.status}）` : ''}，建议保存配置后再开始远程回合。`, dismissible: true });
      return;
    }
    const reason = result.status
      ? `HTTP ${result.status}，服务端拒绝了请求。`
      : '网络请求未完成。';
    addNotification({ id: 'notification-api-test-failed', kind: 'danger', title: '接口连接失败', message: `${reason}请检查 URL、模型、授权和浏览器跨域策略。`, dismissible: true });
  };

  return (
    <section id="settings-panel-connection" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-connection">
      <header className="settings-workspace-heading"><div><span className="panel-code">OPENAI COMPATIBLE / LOCAL SECRET</span><h2>接口连接</h2><p>设置 OpenAI 兼容端点。API 密钥只保留在当前浏览器 IndexedDB，不进入备份、日志或状态摘要。</p></div><span className={`settings-mode-indicator is-${draft.api.apiKey.trim() ? 'remote' : 'local'}`}><PlugsConnected size={17} aria-hidden />{draft.api.apiKey.trim() ? '远程待验证' : '本地模拟'}</span></header>
      <div className="settings-connection-grid">
        <fieldset className="settings-fieldset"><legend>主接口 / 剧情生成</legend>
          <label htmlFor="settings-api-base-url"><span>API 基础 URL</span><input id="settings-api-base-url" value={draft.api.baseUrl} aria-invalid={Boolean(errors.baseUrl)} aria-describedby={errors.baseUrl ? 'settings-api-base-url-error' : undefined} onChange={(event) => setPrimary('baseUrl', event.target.value)} onBlur={() => validate('baseUrl')} /></label>{errors.baseUrl ? <p id="settings-api-base-url-error" className="settings-field-error" role="alert">{errors.baseUrl}</p> : null}
          <label htmlFor="settings-api-model"><span>模型名称</span><input id="settings-api-model" value={draft.api.model} aria-invalid={Boolean(errors.model)} aria-describedby={errors.model ? 'settings-api-model-error' : undefined} onChange={(event) => setPrimary('model', event.target.value)} onBlur={() => validate('model')} /></label>{errors.model ? <p id="settings-api-model-error" className="settings-field-error" role="alert">{errors.model}</p> : null}
          <div className="settings-labeled-field"><label htmlFor="settings-api-key">API 密钥</label><div className="settings-secret-field"><input id="settings-api-key" type={showPrimaryKey ? 'text' : 'password'} autoComplete="off" value={draft.api.apiKey} onChange={(event) => setPrimary('apiKey', event.target.value)} /><button id="settings-api-key-toggle" type="button" aria-label={showPrimaryKey ? '隐藏 API 密钥' : '显示 API 密钥'} onClick={() => setShowPrimaryKey((value) => !value)}>{showPrimaryKey ? <EyeSlash size={17} aria-hidden /> : <Eye size={17} aria-hidden />}</button></div><small>密钥不会在通知、请求摘要或导出文件中回显。</small></div>
          <label htmlFor="settings-api-timeout"><span>请求超时 / 毫秒</span><input id="settings-api-timeout" type="number" min={1000} max={300000} value={draft.api.timeout} onChange={(event) => setPrimary('timeout', Number(event.target.value))} /></label>
          <div className="settings-fieldset-actions"><button id="settings-api-test" className="terminal-button" type="button" disabled={testing} onClick={() => void runTest()}><PlugsConnected size={17} aria-hidden />{testing ? '正在测试' : '测试主接口连接'}</button></div>
        </fieldset>
        <fieldset className={`settings-fieldset is-secondary${secondary.enabled ? ' is-enabled' : ''}`}><legend>次级接口 / 变量与摘要</legend>
          <label className="settings-toggle-row" htmlFor="settings-secondary-enabled"><span><strong>启用次级接口</strong><small>默认关闭；开启后仅用于结构化任务分流。</small></span><input id="settings-secondary-enabled" type="checkbox" aria-label="启用次级接口" checked={secondary.enabled} onChange={(event) => setSecondary('enabled', event.target.checked)} /><i aria-hidden="true" /></label>
          <label htmlFor="settings-secondary-url"><span>次级接口 URL</span><input id="settings-secondary-url" disabled={!secondary.enabled} value={secondary.baseUrl} onChange={(event) => setSecondary('baseUrl', event.target.value)} onBlur={() => validate('secondaryBaseUrl')} /></label>{errors.secondaryBaseUrl ? <p className="settings-field-error" role="alert">{errors.secondaryBaseUrl}</p> : null}
          <label htmlFor="settings-secondary-model"><span>次级模型名称</span><input id="settings-secondary-model" disabled={!secondary.enabled} value={secondary.model} onChange={(event) => setSecondary('model', event.target.value)} onBlur={() => validate('secondaryModel')} /></label>{errors.secondaryModel ? <p className="settings-field-error" role="alert">{errors.secondaryModel}</p> : null}
          <div className="settings-labeled-field"><label htmlFor="settings-secondary-key">次级 API 密钥</label><div className="settings-secret-field"><input id="settings-secondary-key" type={showSecondaryKey ? 'text' : 'password'} disabled={!secondary.enabled} value={secondary.apiKey} onChange={(event) => setSecondary('apiKey', event.target.value)} /><button id="settings-secondary-key-toggle" type="button" disabled={!secondary.enabled} aria-label={showSecondaryKey ? '隐藏次级 API 密钥' : '显示次级 API 密钥'} onClick={() => setShowSecondaryKey((value) => !value)}>{showSecondaryKey ? <EyeSlash size={17} aria-hidden /> : <Eye size={17} aria-hidden />}</button></div></div>
          <div className="settings-security-note"><ShieldCheck size={20} aria-hidden /><div><strong>任务边界</strong><p>次级接口不会接管剧情正文，关闭时所有任务由主接口或本地模拟完成。</p></div></div>
        </fieldset>
      </div>
      <footer className="settings-workspace-actions"><span><CheckCircle size={16} aria-hidden />字段更改需保存后应用</span><button id="settings-api-save" className="terminal-button is-primary" type="button" onClick={() => void save()}><FloppyDisk size={17} aria-hidden />保存接口配置</button></footer>
    </section>
  );
}
