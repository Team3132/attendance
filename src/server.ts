import { createPubSub } from "@graphql-yoga/subscription";
import { type Register, createServerOnlyFn } from "@tanstack/react-start";
import type { RequestOptions } from "@tanstack/react-start/server";
import handler from "@tanstack/react-start/server-entry";
import type { Server, WebSocketHandler } from "bun";
import { Cron, scheduledJobs } from "croner";
import { DateTime } from "luxon";
import type z from "zod";
import type { SessionValidationResult } from "./server/auth/session";
import { type DB, initialiseDatabase } from "./server/drizzle/db";
import { getKV } from "./server/drizzle/kv";
import env from "./server/env";
import type { RSVPStatusSchema } from "./server/schema/RSVPStatusSchema";
import { reminderFn } from "./server/services/adminService";
import { logger } from "./utils/logger";
import { trytm } from "./utils/trytm";

console.log("starting server");

/**
 * A pubsub events manager for future websocket features
 */
const pubSub = createPubSub<{
  "event:rsvpUpdated": [
    eventId: string,
    payload: {
      userId: string;
      rsvpId: string;
      status?: z.infer<typeof RSVPStatusSchema> | null;
    },
  ];
}>();

const [db, dbInitError] = await trytm(initialiseDatabase());
if (dbInitError) {
  console.log("dbInitError", dbInitError);
  throw dbInitError;
}

const kv = getKV(db);

/**
 * Restore CRON Jobs
 */
async function restoreCron(db: DB) {
  const filters = await db.query.eventParsingRuleTable.findMany();

  for (const filter of filters) {
    const existingJobs = scheduledJobs.filter((job) => job.name === filter.id);

    for (const job of existingJobs) {
      logger.withTag("Tasks").info(`${job.name} deleted`);
      job.stop();
    }

    const job = new Cron(
      filter.cronExpr,
      {
        name: filter.id,
        timezone: env.TZ,
        catch: (error) => {
          logger.withTag("Tasks").error(error);
        },
      },
      (job) => reminderFn(job, db),
    );

    const nextRun = job.nextRun();

    logger
      .withTag("Tasks")
      .info(
        `${job.name} (${filter.name}) created, next run: ${
          nextRun
            ? DateTime.fromJSDate(nextRun).toLocaleString(DateTime.DATETIME_MED)
            : "unknown"
        }`,
      );
  }
}

if (!env.TSS_PRERENDERING) {
  const [_res, error] = await trytm(restoreCron(db));
  if (error) {
    console.log(error);
    throw error;
  }
}

export type BunWebsocketEvents = Pick<
  WebSocketHandler<BunWebsocketEvents>,
  "open" | "close" | "message"
>;

export type ServerContext = {
  server?: Server<WebsocketContext>;
  pubSub: typeof pubSub;
  db: DB;
  kv: ReturnType<typeof getKV>;
};

export type WebsocketContext = SessionValidationResult;

// This needs to be tanstack router, currently incorrect
declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: ServerContext;
    };
  }
}

const serverHandler = createServerOnlyFn(handler.fetch);

const websocketHandler: WebSocketHandler<WebsocketContext> = {
  data: {} as WebsocketContext,
  message: (ws, message) => {
    logger.log("Message received from websocket", message);
    ws.send("Hello from 3132!");
  },
  open: (ws) => {
    logger.log("Websocket connection opened!");
    ws.send("Hello from server!");
  },
  close: (_ws, _code, _reason) => {
    logger.log("Websocket connection closed!");
  },
};

export default {
  fetch(
    req: Request,
    opts: RequestOptions<Register>,
  ): Response | Promise<Response> {
    const context = {
      ...opts?.context,
      pubSub,
      db,
      kv,
    } satisfies ServerContext;

    return serverHandler(req, { context });
  },
  websocket: websocketHandler,
};
