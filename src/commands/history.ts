import { ObservableFeed } from '../common/observer-utils.js';
import {
  Command,
  CommandHandler,
  CommandHandlers,
  ExecutedCommand,
} from './command.interface';

export type CommandHistoryObject = {
  stack: ExecutedCommand<any, any, any>[];
  redoStack: ExecutedCommand<any, any, any>[];
};
export type ExecutionInfo = {
  type: 'execute' | 'undo' | 'redo';
  description: string;
};

export class CommandHistory<T> {
  // State
  private stack: ExecutedCommand<any, any, any>[] = [];

  private redoStack: ExecutedCommand<any, any, any>[] = [];

  private sequenceNumber = 0;

  private stateObject: T;

  // Handlers
  handlers: Map<string, CommandHandler<T, any, any>>;

  // Settings
  private maxHistoryLength = 10000;

  // Output
  private _stateChange = new ObservableFeed<ExecutionInfo>();

  stateChange = this._stateChange.observable;

  constructor(stateObject: T, options?: { maxHistoryLength?: number }) {
    this.stateObject = stateObject;
    this.handlers = new Map();
    if (options?.maxHistoryLength) {
      this.maxHistoryLength = options.maxHistoryLength;
    }
  }

  // Public methods
  public registerHandler<TYPE extends string>(
    type: TYPE,
    handler: CommandHandler<T, any, any>
  ) {
    this.handlers.set(type, handler);
  }

  public registerHandlers(collection: CommandHandlers<T>) {
    Object.entries(collection.handlers).forEach(([type, handler]) => {
      this.registerHandler(`${collection.namespace}.${type}`, handler);
    });
  }

  public executeCommand<TYPE extends string>(command: Command<any, TYPE>) {
    this._execute(command);
  }

  private _execute<TYPE extends string>(
    command: Command<any, TYPE>,
    redoing = false
  ) {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command type ${command.type}`);
    }
    const result = handler.execute(this.stateObject, ...command.payload);
    this.stack.push({
      command,
      result,
      sequenceNumber: this.sequenceNumber++,
    });
    if (!redoing) {
      this.redoStack = [];
      this._stateChange.next({
        type: 'execute',
        description: handler.description(command.payload),
      });
    } else {
      this._stateChange.next({
        type: 'redo',
        description: handler.description(command.payload),
      });
    }
    this.trimStack();
  }

  public undo() {
    const executedCommand = this.stack.pop();
    if (executedCommand) {
      this.redoStack.push(executedCommand);
      const handler = this.handlers.get(executedCommand.command.type);
      if (!handler) {
        throw new Error(
          `No handler registered for command type ${executedCommand.command.type}`
        );
      }
      handler.undo(
        this.stateObject,
        executedCommand.result,
        ...executedCommand.command.payload
      );
      this._stateChange.next({
        type: 'undo',
        description: handler.description(executedCommand.command.payload),
      });
    }
  }

  public redo() {
    const executedCommand = this.redoStack.pop();
    if (executedCommand) {
      this._execute(executedCommand.command, true);
    }
  }

  public getHistory() {
    return this.stack;
  }

  public getRedoHistory() {
    return this.redoStack;
  }

  public getSequenceNumber() {
    return this.sequenceNumber;
  }

  public execute<
    CH extends CommandHandlers<T>,
    TYPE extends keyof CH['handlers']
  >(
    commandHandlers: CH,
    type: TYPE,
    ...payload: CH['handlers'][TYPE]['execute'] extends (
      state: T,
      ...p: infer P
    ) => any
      ? P
      : never
  ) {
    this._execute({
      type: `${commandHandlers.namespace}.${type as string}`,
      payload,
    });
  }

  public getObjectRepresentation(): CommandHistoryObject {
    return {
      stack: this.stack,
      redoStack: this.redoStack,
    };
  }

  public loadObjectRepresentation(object: CommandHistoryObject) {
    this.stack = object.stack;
    this.redoStack = object.redoStack;
  }

  // Private methods
  private trimStack() {
    if (this.stack.length > this.maxHistoryLength) {
      this.stack.shift();
    }
  }
}
