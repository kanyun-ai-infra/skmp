declare module 'tabtab' {
  export interface TabtabEnv {
    /** Whether we're in completion mode */
    complete: boolean;
    /** Number of words in the completed line */
    words: number;
    /** Cursor position */
    point: number;
    /** The full input line */
    line: string;
    /** Part of line preceding cursor position */
    partial: string;
    /** Last word of the line */
    last: string;
    /** Last word of partial */
    lastPartial: string;
    /** Word preceding last */
    prev: string;
  }

  export interface CompletionItem {
    name: string;
    description?: string;
  }

  export interface InstallOptions {
    /** Name of the CLI program */
    name: string;
    /** Name of the completer (usually same as name) */
    completer: string;
  }

  export interface UninstallOptions {
    /** Name of the CLI program */
    name: string;
  }

  /**
   * Get the current shell type
   */
  export function shell(): string;

  /**
   * Install completion scripts interactively
   */
  export function install(options: InstallOptions): Promise<void>;

  /**
   * Uninstall completion scripts
   */
  export function uninstall(options: UninstallOptions): Promise<void>;

  /**
   * Parse environment variables to get completion context
   */
  export function parseEnv(env: NodeJS.ProcessEnv): TabtabEnv;

  /**
   * Log completion items to stdout
   */
  export function log(items: (string | CompletionItem)[]): void;
}
