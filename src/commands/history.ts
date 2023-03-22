import { Command, ExecutedCommand } from './command.interface';

export class CommandHistory<T> {
  // State
  private stack: ExecutedCommand<T>[] = [];

  private redoStack: ExecutedCommand<T>[] = [];

  private sequenceNumber = 0;

  private stateObject: T;

  // Settings
  private maxHistoryLength = 10000;

  constructor(stateObject: T, options?: { maxHistoryLength?: number }) {
    this.stateObject = stateObject;
    if (options?.maxHistoryLength) {
      this.maxHistoryLength = options.maxHistoryLength;
    }
  }

  // Public methods
  public execute(command: Command<T>) {
    this.stack.push({
      command,
      sequenceNumber: this.sequenceNumber++,
    });
    this.redoStack = [];
    this.trimStack();
    command.execute(this.stateObject);
    document.dispatchEvent(
      new CustomEvent('command-executed', { detail: command.getDescription() })
    );
  }

  public undo() {
    const executedCommand = this.stack.pop();
    if (executedCommand) {
      this.redoStack.push(executedCommand);
      executedCommand.command.undo(this.stateObject);
      document.dispatchEvent(
        new CustomEvent('command-undone', {
          detail: executedCommand.command.getDescription(true),
        })
      );
    }
  }

  public redo() {
    const executedCommand = this.redoStack.pop();
    if (executedCommand) {
      this.stack.push(executedCommand);
      executedCommand.command.execute(this.stateObject);
      document.dispatchEvent(
        new CustomEvent('command-executed', {
          detail: executedCommand.command.getDescription(),
        })
      );
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

  // Private methods
  private trimStack() {
    if (this.stack.length > this.maxHistoryLength) {
      this.stack.shift();
    }
  }
}