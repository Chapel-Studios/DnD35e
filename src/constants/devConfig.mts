import { LogLevel } from './logging.mjs';

const isDevMode: boolean = true;
const shouldLogNonCriticalErrors: boolean = true;
const logLevel: LogLevel = LogLevel.DEBUG;

export const devConfig: {
  isDevMode: boolean;
  shouldLogNonCriticalErrors: boolean;
  logLevel: LogLevel;
} = {
  isDevMode,
  shouldLogNonCriticalErrors,
  logLevel,
};
