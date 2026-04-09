const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
} as const;

type LogLevelValue = (typeof LogLevel)[keyof typeof LogLevel];

export {
  LogLevel,
};

export type {
  LogLevelValue,
};
