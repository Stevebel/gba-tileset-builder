import { property, State, storage } from '@lit-app/state';
import { CommandHandlers } from '../commands/command.interface.js';
import { ToolType } from '../common/constants.js';
import { TilesetDocument } from './tileset-document.js';

const DefaultViewOptions = {
  showGrid: true,
  showPaletteNumbers: true,
};

class EditorState extends State {
  @storage({ key: 'currentTool' })
  @property()
  currentTool!: ToolType;

  @storage({ key: 'lastTool' })
  @property()
  lastTool?: ToolType;

  @storage({ key: 'viewOptions' })
  @property({ type: Object })
  viewOptions!: typeof DefaultViewOptions;

  @storage({ key: 'selectedPaletteIndex' })
  @property({ type: Number })
  selectedPaletteIndex?: number;

  @storage({ key: 'selectedColors' })
  @property({ type: Array })
  selectedColors!: number[];

  @property({ type: String })
  replacementColor?: number;

  @property()
  hoverColor?: number;

  @property({ type: Object })
  currentDocument = new TilesetDocument();

  @property({ type: Array })
  openDocuments: TilesetDocument[] = [];

  private documentCommandHandlers: CommandHandlers<TilesetDocument>[] = [];

  constructor() {
    super();
    if (!this.currentTool) {
      this.currentTool = 'select';
    }
    if (!this.viewOptions) {
      this.viewOptions = DefaultViewOptions;
    }
    if (!this.selectedColors) {
      this.selectedColors = [];
    }
    if (!this.openDocuments) {
      this.openDocuments = [];
    }
    if (
      this.currentDocument &&
      this.openDocuments.indexOf(this.currentDocument) === -1
    ) {
      this.openDocuments.push(this.currentDocument);
    }
  }

  public setCurrentDocument(doc: TilesetDocument) {
    this.currentDocument = doc;
    this.documentCommandHandlers.forEach(handlers =>
      doc.history.registerHandlers(handlers)
    );
    console.log(this.documentCommandHandlers);
  }

  public open(imageDataURL: string) {
    const doc = new TilesetDocument(imageDataURL);
    this.setCurrentDocument(doc);
    this.openDocuments.push(this.currentDocument);
  }

  public get history() {
    return this.currentDocument.history;
  }

  selectColor(paletteIndex: number, color: number) {
    if (this.selectedPaletteIndex !== paletteIndex) {
      this.selectedPaletteIndex = paletteIndex;
      this.selectedColors = [color];
    } else if (this.selectedColors.includes(color)) {
      this.selectedColors = this.selectedColors.filter(c => c !== color);
    } else if (this.selectedColors.length > 0) {
      this.selectedColors = [
        this.selectedColors[this.selectedColors.length - 1],
        color,
      ];
    } else {
      this.selectedColors = [color];
    }
  }

  public commands<CH extends CommandHandlers<TilesetDocument>>(
    commandHandlers: CH
  ) {
    this.documentCommandHandlers.push(commandHandlers);
    console.log(this.openDocuments, this.currentDocument);
    this.openDocuments.forEach(doc =>
      doc.history.registerHandlers(commandHandlers)
    );
    // Create an object with the same keys as the handlers, but with a function
    // that executes the command.
    return {
      commandHandlers,
      ...Object.fromEntries(
        Object.keys(commandHandlers.handlers).map(type => [
          type,
          (...payload: any[]) => {
            this.currentDocument.history.executeCommand({
              type: `${commandHandlers.namespace}.${type}`,
              payload,
            });
          },
        ])
      ),
    } as {
      [TYPE in keyof CH['handlers']]: CH['handlers'][TYPE]['execute'] extends (
        state: TilesetDocument,
        ...p: infer P
      ) => any
        ? (...payload: P) => void
        : never;
    } & {
      commandHandlers: CH;
    };
  }
}

export const editorState = new EditorState();

export const execute: (typeof TilesetDocument)['prototype']['history']['execute'] =
  (...args) => editorState.history.execute(...args);
