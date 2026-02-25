import { LogLevels, createConsola } from "consola";

export const logger = import.meta.env.SSR
  ? createConsola({
      level: import.meta.env.DEV ? LogLevels.debug : undefined,
      formatOptions: {
        date: import.meta.env.PROD,
      },
    })
  : createConsola({
      level: LogLevels.debug,
    }).withTag("Client");

if (import.meta.env.SSR && import.meta.env.PROD) {
  logger.setReporters([
    {
      log: (logObj) => console.log(JSON.stringify(logObj)),
    },
  ]);
}
