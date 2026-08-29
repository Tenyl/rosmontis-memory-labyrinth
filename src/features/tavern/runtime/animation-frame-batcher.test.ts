import { describe, expect, it, vi } from 'vitest';
import { AnimationFrameBatcher } from './animation-frame-batcher';

describe('AnimationFrameBatcher', () => {
  it('merges multiple stream chunks into one render-frame commit', () => {
    const scheduled: { callback?: FrameRequestCallback } = {};
    const flush = vi.fn();
    const batcher = new AnimationFrameBatcher<string>(flush, (callback) => {
      scheduled.callback = callback;
      return 7;
    }, vi.fn());

    batcher.enqueue(['a']);
    batcher.enqueue(['b', 'c']);

    expect(flush).not.toHaveBeenCalled();
    expect(scheduled.callback).toBeTypeOf('function');
    if (!scheduled.callback) throw new Error('动画帧未调度');
    scheduled.callback(16);
    expect(flush).toHaveBeenCalledOnce();
    expect(flush).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('flushes pending work immediately and cancels the scheduled frame', () => {
    const cancel = vi.fn();
    const flush = vi.fn();
    const batcher = new AnimationFrameBatcher<number>(flush, () => 11, cancel);

    batcher.enqueue([1, 2]);
    batcher.flushNow();

    expect(cancel).toHaveBeenCalledWith(11);
    expect(flush).toHaveBeenCalledWith([1, 2]);
  });

  it('calls browser frame APIs with the Window receiver', () => {
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(function (this: Window) {
      if (this !== window) throw new TypeError('Illegal invocation');
      return 13;
    });
    const batcher = new AnimationFrameBatcher<string>(vi.fn());

    expect(() => batcher.enqueue(['frame'])).not.toThrow();
    expect(request).toHaveBeenCalledOnce();
  });
});
