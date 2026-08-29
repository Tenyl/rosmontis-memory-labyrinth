type ScheduleFrame = (callback: FrameRequestCallback) => number;
type CancelFrame = (handle: number) => void;

export class AnimationFrameBatcher<T> {
  private pending: T[] = [];
  private frameHandle: number | null = null;

  constructor(
    private readonly commit: (items: T[]) => void,
    private readonly schedule: ScheduleFrame = (callback) => window.requestAnimationFrame(callback),
    private readonly cancel: CancelFrame = (handle) => window.cancelAnimationFrame(handle),
  ) {}

  enqueue(items: T[]) {
    if (items.length === 0) return;
    this.pending.push(...items);
    if (this.frameHandle !== null) return;
    this.frameHandle = this.schedule(() => {
      this.frameHandle = null;
      this.commitPending();
    });
  }

  flushNow() {
    if (this.frameHandle !== null) {
      this.cancel(this.frameHandle);
      this.frameHandle = null;
    }
    this.commitPending();
  }

  private commitPending() {
    if (this.pending.length === 0) return;
    const batch = this.pending;
    this.pending = [];
    this.commit(batch);
  }
}
