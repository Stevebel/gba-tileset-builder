export interface Command<P extends any[], TYPE extends string> {
  type: TYPE;
  payload: P;
}

export type CommandHandler<T, P extends any[], R> = {
  description: (...payload: P) => string;
  execute: (state: T, ...payload: P) => R;
  undo: (state: T, result: R, ...payload: P) => void;
};
export interface ExecutedCommand<P extends any[], TYPE extends string, R> {
  command: Command<P, TYPE>;
  result: R;
  sequenceNumber: number;
}

export type CommandHandlers<T> = {
  namespace: string;
  handlers: { [K: string]: CommandHandler<T, any, any> };
};

export function createHandler<T>() {
  return {
    withExecute<P extends any[], R>(execute: (state: T, ...payload: P) => R) {
      return {
        withUndo(undo: (state: T, result: R, ...payload: P) => void) {
          return {
            withDescription(description: (...payload: P) => string) {
              return {
                description,
                execute,
                undo,
              };
            },
          };
        },
      };
    },
  };
}
