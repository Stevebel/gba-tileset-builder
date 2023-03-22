import { StateEvent } from '@lit-app/state';
import { ReactiveController, ReactiveControllerHost } from 'lit';
import { editorState } from './editor-state.js';
import { TilesetDocument } from './tileset-document.js';

type Callback = () => void;

export class TilesetDocumentStateController implements ReactiveController {
  callback: Callback;

  editorChangeCallback: (e: Event) => void;

  lastDocument!: TilesetDocument;

  constructor(protected host: ReactiveControllerHost, cb?: Callback) {
    this.host.addController(this);
    this.callback = cb ?? (() => this.host.requestUpdate());
    this.editorChangeCallback = this.handleEditorChange.bind(this);
  }

  hostConnected(): void {
    editorState.addEventListener(
      StateEvent.eventName,
      this.editorChangeCallback
    );
    this.updateListeners();
    this.callback();
  }

  handleEditorChange(evt: Event): void {
    const e = evt as StateEvent;
    if (e.key === 'currentDocument') {
      this.updateListeners();
    }
    this.callback();
  }

  private updateListeners(): void {
    if (this.lastDocument) {
      this.lastDocument.removeEventListener(
        StateEvent.eventName,
        this.callback
      );
    }
    if (editorState.currentDocument) {
      editorState.currentDocument.addEventListener(
        StateEvent.eventName,
        this.callback
      );
      this.lastDocument = editorState.currentDocument;
    }
  }

  hostDisconnected(): void {
    editorState.removeEventListener(
      StateEvent.eventName,
      this.editorChangeCallback
    );
    this.lastDocument.removeEventListener(StateEvent.eventName, this.callback);
  }
}
