export function App() {
  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">
        跳至主内容
      </a>
      <header className="bootstrap-header">
        <div className="brand-mark" aria-hidden="true">
          <span>R</span>
          <i />
        </div>
        <div>
          <p className="eyebrow">RHODES COGNITION TERMINAL</p>
          <strong>罗德岛意识战术终端</strong>
        </div>
      </header>
      <main id="main-content" className="bootstrap-main" tabIndex={-1}>
        <span className="system-code">SESSION / LOCAL-PROTOTYPE</span>
        <p>终端正在建立本地演示会话</p>
      </main>
    </div>
  );
}
