import { Observable, Subscription } from 'rxjs';

export function inductor<T>(seed: T, next: (p: T) => Observable<T> | undefined): Observable<T> {
  return new Observable<T>(s => {
    let last: T;
    let child: Subscription;

    const switchTo = (o: Observable<T>) => {
      child = o.subscribe({
        next: v => {
          last = v;
          s.next(v);
        },
        error: err => s.error(err),
        complete: () => {
          if (child) {
            child.unsubscribe();
          }
          const nextObservable = last && next(last);
          if (nextObservable === undefined) {
            s.complete();
          } else {
            switchTo(nextObservable);
          }
        }
      });
    };

    const first = next(seed);

    if (first) {
      switchTo(first);
    }

    return () => {
      if (child) {
        child.unsubscribe();
      }
    };
  });
}
