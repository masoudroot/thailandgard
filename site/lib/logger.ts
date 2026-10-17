class Logger {
  private formatMessage(level: string, message: string, meta?: unknown): string {
    let serializedMeta = '';
    if (meta !== undefined) {
      try {
        serializedMeta = JSON.stringify(meta);
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        serializedMeta = JSON.stringify({ errorName: err.name, errorMessage: err.message });
      }
    }
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${serializedMeta}`;
  }

  private sendLog(formattedMessage: string): void {
    console.log(formattedMessage);
  }

  public api(message: string, meta?: unknown): void {
    const formattedMessage = this.formatMessage('API', message, meta);
    this.sendLog(formattedMessage);
  }

  public info(message: string, meta?: unknown): void {
    const formattedMessage = this.formatMessage('INFO', message, meta);
    this.sendLog(formattedMessage);
  }

  public error(message: string, meta?: unknown): void {
    const formattedMessage = this.formatMessage('ERROR', message, meta);
    this.sendLog(formattedMessage);
  }

  public warn(message: string, meta?: unknown): void {
    const formattedMessage = this.formatMessage('WARN', message, meta);
    this.sendLog(formattedMessage);
  }
}

export const logger = new Logger();
