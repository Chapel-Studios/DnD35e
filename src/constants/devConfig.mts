import type { LogLevelValue } from './logging.mjs';
import { LogLevel } from './logging.mjs';

const isDevMode: boolean = true;
const shouldLogNonCriticalErrors: boolean = true;
const logLevel: LogLevelValue = LogLevel.DEBUG;

const devConfig: {
  isDevMode: boolean;
  shouldLogNonCriticalErrors: boolean;
  logLevel: LogLevelValue;
} = {
  isDevMode,
  shouldLogNonCriticalErrors,
  logLevel,
};

export {
  devConfig,
};
