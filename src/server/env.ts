import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const env = createEnv({
  client: {
    VITE_URL: z.url().default("http://localhost:1420"),
  },
  server: {
    /**
     * Database
     */
    DATABASE_URL: z.url().default("file://./data"),
    /**
     * Bot stuff
     */
    DISCORD_CLIENT_ID: z.string().optional(),
    DISCORD_CLIENT_SECRET: z.string().optional(),
    DISCORD_PUBLIC_KEY: z.string().optional(),
    DISCORD_TOKEN: z.string().optional(),
    /**
     * Misc
     */
    GUILD_ID: z.string().optional(),

    /**
     * Calendar stuff
     */
    GOOGLE_CLIENT_EMAIL: z.string().optional(),
    GOOGLE_PRIVATE_KEY: z.string().optional(),
    GOOGLE_CALENDAR_ID: z.string().optional(),
    /**
     * Roles
     */
    ADMIN_ROLE_ID: z.string().optional(),
    TSS_PRERENDERING: z.coerce.boolean(),
    TZ: z.string().default("Australia/Sydney"),
  },
  runtimeEnv: import.meta.env.SSR ? process.env : import.meta.env,
  isServer: import.meta.env.SSR,
  clientPrefix: "VITE_",
});

export default env;
