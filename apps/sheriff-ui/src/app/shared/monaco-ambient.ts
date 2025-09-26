export interface MonacoDisposable {
  dispose(): void;
}

export interface MonacoEditorInstance {
  getValue(): string;
  setValue(value: string): void;
  layout(): void;
  onDidChangeModelContent(listener: () => void): MonacoDisposable;
  dispose(): void;
}

export interface MonacoEditorNamespace {
  create(
    container: HTMLElement,
    options: {
      value?: string;
      language?: string;
      automaticLayout?: boolean;
      minimap?: { enabled: boolean };
      readOnly?: boolean;
      theme?: string;
    },
  ): MonacoEditorInstance;
}

export interface MonacoGlobal {
  editor: MonacoEditorNamespace;
}

declare global {
  var monaco: MonacoGlobal | undefined;
  var require:
    | {
        config: (c: unknown) => void;
        (deps: string[], cb: () => void): void;
      }
    | undefined;

  interface Window {
    monaco?: MonacoGlobal;
    require?: {
      config: (c: unknown) => void;
      (deps: string[], cb: () => void): void;
    };
  }
}


