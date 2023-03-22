import { property, State, storage } from '@lit-app/state';
import { Command } from '../commands/command.interface.js';
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
      if (this.currentDocument) {
        this.openDocuments.push(this.currentDocument);
      }
    }
  }

  public setCurrentDocument(doc: TilesetDocument) {
    this.currentDocument = doc;
  }

  public open(imageDataURL: string) {
    this.setCurrentDocument(new TilesetDocument(imageDataURL));
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
}

export const editorState = new EditorState();

export function execute(command: Command<TilesetDocument>) {
  editorState.history.execute(command);
}
