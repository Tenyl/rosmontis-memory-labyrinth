import type { ReactNode } from 'react';

interface PageHeaderProps {
  code: string;
  title: string;
  description: string;
  meta?: string;
  actions?: ReactNode;
}

export function PageHeader({ code, title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-index" aria-hidden="true">{code}</div>
      <div className="page-header-copy">
        <div className="page-header-meta"><span>RHODES / TERMINAL</span>{meta ? <i>{meta}</i> : null}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
