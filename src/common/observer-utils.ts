import { Observable } from 'zen-observable-ts';

export class ObservableFeed<T> {
  private _observable: Observable<T>;

  private subscriptions: { next: (value: T) => void; complete: () => void }[] =
    [];

  private lastValue: T | undefined;

  constructor(initialValue?: T, sendLastValueOnSubscribe = true) {
    this.lastValue = initialValue;
    this._observable = new Observable(observer => {
      if (sendLastValueOnSubscribe && initialValue) {
        observer.next(initialValue);
      }
      this.subscriptions.push(observer);
    });
  }

  next(value: T) {
    this.lastValue = value;
    this.subscriptions.forEach(subscription => subscription.next(value));
  }

  complete() {
    this.subscriptions.forEach(subscription => subscription.complete());
    this.subscriptions = [];
  }

  get observable() {
    return this._observable;
  }
}
