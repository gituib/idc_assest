const isDev = import.meta.env.DEV;

const noop = () => {};

export const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: console.error.bind(console),
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
  
  group: isDev ? console.group.bind(console) : noop,
  groupEnd: isDev ? console.groupEnd.bind(console) : noop,
  groupCollapsed: isDev ? console.groupCollapsed.bind(console) : noop,
  
  table: isDev ? console.table.bind(console) : noop,
  trace: isDev ? console.trace.bind(console) : noop,
  time: isDev ? console.time.bind(console) : noop,
  timeEnd: isDev ? console.timeEnd.bind(console) : noop,
  timeLog: isDev ? console.timeLog.bind(console) : noop,
  
  clear: isDev ? console.clear.bind(console) : noop,
};

export default logger;
