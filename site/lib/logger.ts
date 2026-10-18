type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_NAMES: Record<string, true> = {
  debug: true,
  info: true,
  warn: true,
  error: true,
};

function normalizeLevel(level: string): LogLevel {
  const normalized = level.trim().toLowerCase();
  return LEVEL_NAMES[normalized] ? (normalized as LogLevel) : 'info';
}

class Logger {
  private static instance: Logger | null = null;
  private readonly minLevel: LogLevel;

  private constructor() {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    const configuredLevel = env?.env?.LOG_LEVEL;
    this.minLevel = configuredLevel ? normalizeLevel(configuredLevel) : 'info';
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private isEnabled(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[this.minLevel];
  }

  private format(level: LogLevel, message: string): string {
    return '[' + level + '] [' + new Date().toISOString() + '] ' + message;
  }

  private write(level: LogLevel, message: string): void {
    if (!this.isEnabled(level)) {
      return;
    }

    const output = this.format(level, message);

    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  private emit(methodLevel: LogLevel, levelOrMessage: LogLevel | string, message?: string): void {
    if (message === undefined) {
      this.write(methodLevel, levelOrMessage);
      return;
    }

    this.write(normalizeLevel(levelOrMessage), message);
  }

  log(level: LogLevel | string, message: string): void {
    this.write(normalizeLevel(level), message);
  }

  info(message: string): void;
  info(level: LogLevel | string, message: string): void;
  info(levelOrMessage: LogLevel | string, message?: string): void {
    this.emit('info', levelOrMessage, message);
  }

  warn(message: string): void;
  warn(level: LogLevel | string, message: string): void;
  warn(levelOrMessage: LogLevel | string, message?: string): void {
    this.emit('warn', levelOrMessage, message);
  }

  error(message: string): void;
  error(level: LogLevel | string, message: string): void;
  error(levelOrMessage: LogLevel | string, message?: string): void {
    this.emit('error', levelOrMessage, message);
  }

  debug(message: string): void;
  debug(level: LogLevel | string, message: string): void;
  debug(levelOrMessage: LogLevel | string, message?: string): void {
    this.emit('debug', levelOrMessage, message);
  }
}

const logger = Logger.getInstance();

export default logger;
export { Logger };
export type { LogLevel };