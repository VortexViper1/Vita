/**
 * Rejects if the promise doesn't settle within `ms`, so a stalled request
 * ends in an error state instead of an endless spinner.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message = "Request timed out"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}