import { useEffect, useLayoutEffect, useRef } from 'react';
import { NODE_TYPE_NAMES } from '../../game/terminology';
import type { MazeNode } from '../../game/types';

interface NodeTransitionLayerProps {
  phase: 'entering-node' | 'returning-map';
  node: MazeNode;
  transitionId: number;
  reducedMotion: boolean;
  onCommit: (transitionId: number) => void;
  onOpened: (nodeId: string) => void;
  onReturnFinished: () => void;
}

export function NodeTransitionLayer({
  phase,
  node,
  transitionId,
  reducedMotion,
  onCommit,
  onOpened,
  onReturnFinished,
}: NodeTransitionLayerProps) {
  const callbacks = useRef({ onCommit, onOpened, onReturnFinished });

  useLayoutEffect(() => {
    callbacks.current = { onCommit, onOpened, onReturnFinished };
  }, [onCommit, onOpened, onReturnFinished]);

  useEffect(() => {
    if (phase === 'returning-map') {
      const returnTimer = window.setTimeout(
        () => callbacks.current.onReturnFinished(),
        reducedMotion ? 120 : 420,
      );
      return () => window.clearTimeout(returnTimer);
    }

    const commitTimer = window.setTimeout(
      () => callbacks.current.onCommit(transitionId),
      reducedMotion ? 0 : 220,
    );
    const finishTimer = window.setTimeout(
      () => callbacks.current.onOpened(node.id),
      reducedMotion ? 120 : 720,
    );
    return () => {
      window.clearTimeout(commitTimer);
      window.clearTimeout(finishTimer);
    };
  }, [node.id, phase, reducedMotion, transitionId]);

  const returning = phase === 'returning-map';

  return (
    <div
      className={`node-transition-layer is-${phase}`}
      data-transition-node-type={node.type}
      role="status"
      aria-live="polite"
    >
      <span>{returning ? '正在返回记忆迷宫' : `正在进入${NODE_TYPE_NAMES[node.type]}`}</span>
      <i className="transition-route-pulse" aria-hidden />
      <i className="transition-aperture" aria-hidden />
    </div>
  );
}
