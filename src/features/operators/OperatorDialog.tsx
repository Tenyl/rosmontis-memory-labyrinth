import { ArrowRight, Lightning, Package, Pulse, UsersThree } from '@phosphor-icons/react';
import { Dialog } from '../../components/Dialog';
import { Meter } from '../../components/Meter';
import type { Operator } from '../../types/game';

interface OperatorDialogProps {
  operator: Operator | null;
  onClose: () => void;
}

export function OperatorDialog({ operator, onClose }: OperatorDialogProps) {
  return (
    <Dialog
      id="operator-dossier-dialog"
      title={`${operator?.name ?? ''}战术档案`}
      eyebrow="OPERATOR DOSSIER / FIELD ACCESS"
      open={Boolean(operator)}
      onClose={onClose}
      footer={<button id="operator-dossier-confirm" className="terminal-button is-primary" type="button" onClick={onClose}>返回小队概况<ArrowRight size={16} aria-hidden /></button>}
    >
      {operator ? (
        <div className="operator-dialog-content">
          <header className="operator-dialog-identity">
            <div className={`operator-sigil is-squad is-${operator.id}`} aria-hidden="true"><span>{operator.name.slice(0, 1)}</span><b>OP</b></div>
            <div><span className="panel-code">{operator.code}</span><strong>{operator.name}</strong><p>{operator.role} · {operator.position}</p></div>
          </header>
          <div className="operator-dialog-vitals"><Meter id={`dialog-health-${operator.id}`} label="生命状态" value={operator.health} tone="arts" /><Meter id={`dialog-stress-${operator.id}`} label="精神负荷" value={operator.stress} tone="warning" /></div>
          <dl className="operator-dialog-next"><div><dt>当前状态</dt><dd>{operator.condition}</dd></div><div><dt>下一行动</dt><dd>{operator.nextAction}</dd></div><div><dt>行动点</dt><dd>{operator.actionPoints} AP</dd></div></dl>
          <div className="operator-dialog-sections">
            <section><h3><Lightning size={16} aria-hidden />能力</h3><ul>{operator.abilities.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><h3><Package size={16} aria-hidden />装备</h3><ul>{operator.equipment.map((item) => <li key={item}>{item}</li>)}</ul></section>
            <section><h3><UsersThree size={16} aria-hidden />关系倾向</h3><p>{operator.relation}</p></section>
            <section><h3><Pulse size={16} aria-hidden />本局临时特征</h3><ul>{operator.temporaryFeatures.map((item) => <li key={item}>{item}</li>)}</ul></section>
          </div>
          <div className="operator-status-source"><span>状态来源</span><p>医疗终端实时监测、上一轮行动结果与当前意识战场环境效应共同计算。</p></div>
        </div>
      ) : null}
    </Dialog>
  );
}
