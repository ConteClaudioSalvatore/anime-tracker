/** A failed write rejects its caller without preventing later retries. */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();
  run(write: () => Promise<void>): Promise<void> {
    const result = this.tail.then(write);
    this.tail = result.catch(() => {});
    return result;
  }
}
