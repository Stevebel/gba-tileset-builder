export interface Command<T> {
  getDescription: (undoing?: boolean) => string;
  execute: (state: T) => void;
  undo: (state: T) => void;
  [key: string]: any;
}
export interface ExecutedCommand<T> {
  command: Command<T>;
  sequenceNumber: number;
}
