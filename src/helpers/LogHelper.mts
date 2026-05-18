import { devConfig } from '../constants/devConfig.mjs';
import type { LogLevelValue } from '../constants/logging.mjs';
import { LogLevel } from '../constants/logging.mjs';

class LogHelper {
  static logLevel: LogLevelValue = devConfig.logLevel;
  static shouldLogNonCriticalErrors: boolean = devConfig.shouldLogNonCriticalErrors;

  static setLogLevel (level: LogLevelValue): void {
    LogHelper.logLevel = level;
  }

  static setShouldLogNonCriticalErrors (shouldLog: boolean): void {
    LogHelper.shouldLogNonCriticalErrors = shouldLog;
  }

  static log (...data: unknown[]): void {
    if (LogHelper.logLevel > LogLevel.DEBUG) return;
    console.log(...data);
  }

  static info (...data: unknown[]): void {
    if (LogHelper.logLevel > LogLevel.INFO) return;
    console.log(...data);
  }

  static warn (...data: unknown[]): void {
    if (!LogHelper.shouldLogNonCriticalErrors) return;
    if (LogHelper.logLevel > LogLevel.WARN) return;
    console.warn(...data);
  }

  static error (...data: unknown[]): void {
    if (!LogHelper.shouldLogNonCriticalErrors && LogHelper.logLevel < LogLevel.FATAL) return;
    if (LogHelper.logLevel > LogLevel.ERROR) return;
    console.error(...data);
  }

  static startTimer (name: string): void {
    if (LogHelper.logLevel !== LogLevel.DEBUG) return;
    console.time(name);
  }

  static getTime (name: string): void {
    if (LogHelper.logLevel !== LogLevel.DEBUG) return;
    console.timeEnd(name);
  }

  static debug (...data: unknown[]): void {
    if (LogHelper.logLevel > LogLevel.DEBUG) return;
    console.log(...data);
  }
}

// Apply config settings on startup
LogHelper.setLogLevel(devConfig.logLevel);
LogHelper.setShouldLogNonCriticalErrors(devConfig.shouldLogNonCriticalErrors);

export {
  LogHelper,
};
