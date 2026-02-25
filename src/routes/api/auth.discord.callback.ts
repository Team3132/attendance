import type { ServerContext } from "@/server";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "@/server/auth/session";
import { userTable } from "@/server/drizzle/schema";
import env from "@/server/env";
import type { ColumnNames } from "@/server/utils/db/ColumnNames";
import { buildConflictUpdateColumns } from "@/server/utils/db/buildConflictUpdateColumns";
import { buildSetWhereColumns } from "@/server/utils/db/buildSetWhereColumns";
import { logger } from "@/utils/logger";
import { trytm } from "@/utils/trytm";
import { API } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { createFileRoute } from "@tanstack/react-router";
import { deleteCookie, getCookie } from "@tanstack/react-start/server";
import { Discord } from "arctic";
import { z } from "zod";

const querySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const Route = createFileRoute("/api/auth/discord/callback")({
  server: {
    handlers: {
      GET: async ({ context: c, request }) => {
        const { db } = c as unknown as ServerContext;
        if (!env.GUILD_ID)
          throw new Error(
            "No guild id defined in config. Please configure and restart server.",
          );
        const headers = new Headers({
          Location: env.VITE_URL,
        });

        const safeQuery = await querySchema.safeParseAsync(
          Object.fromEntries(new URL(request.url).searchParams.entries()),
        );

        if (!safeQuery.success)
          throw new Error("Missing query params, retry request.");

        const { code, state } = safeQuery.data;

        if (
          !env.DISCORD_CLIENT_ID ||
          !env.DISCORD_CLIENT_SECRET ||
          !env.VITE_URL
        ) {
          throw new Error("Login with Discord not configured!");
        }

        const callbackUrl = new URL(env.VITE_URL);

        callbackUrl.pathname = "/api/auth/discord/callback";

        const discord = new Discord(
          env.DISCORD_CLIENT_ID,
          env.DISCORD_CLIENT_SECRET,
          callbackUrl.toString(),
        );

        const discord_oauth_state = getCookie("discord_oauth_state");
        const discord_oauth_code_verifier = getCookie(
          "discord_oauth_code_verifier",
        );
        const { data } = await z.coerce
          .number()
          .optional()
          .safeParseAsync(getCookie("is_tauri"));
        const isTauri = data === 1;

        if (!discord_oauth_code_verifier || !discord_oauth_state)
          throw new Error("No state cookies supplied, retry request.");

        deleteCookie("discord_oauth_state");
        deleteCookie("discord_oauth_code_verifier");
        deleteCookie("is_tauri");

        if (discord_oauth_state !== state) {
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        const [tokens, tokensError] = await trytm(
          discord.validateAuthorizationCode(code, discord_oauth_code_verifier),
        );

        if (tokensError) {
          logger.error("Failed to validate authorization code", tokensError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        const rest = new REST({ version: "10", authPrefix: "Bearer" }).setToken(
          tokens.accessToken(),
        );

        const api = new API(rest);

        const [discordUserGuilds, guildsError] = await trytm(
          api.users.getGuilds(),
        );
        if (guildsError) {
          logger.error("Failed to fetch user guilds", guildsError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        const validGuild = discordUserGuilds.some(
          (guild) => guild.id === env.GUILD_ID,
        );

        if (!validGuild) {
          logger.error(
            "User is not a member of the required guild",
            env.GUILD_ID,
          );
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        const [meData, meError] = await trytm(api.users.get("@me"));

        if (meError) {
          logger.error("Failed to fetch user data", meError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }
        const { id, username } = meData;

        const [guildMemberData, guildMemberError] = await trytm(
          api.users.getGuildMember(env.GUILD_ID),
        );
        if (guildMemberError) {
          logger.error("Failed to fetch guild member data", guildMemberError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }
        const { roles, nick } = guildMemberData;

        const updateColumns: ColumnNames<typeof userTable>[] = [
          "accessToken",
          "roles",
          "refreshToken",
          "accessTokenExpiresAt",
          "username",
        ];

        const [_createdUserResult, userUpdateError] = await trytm(
          db
            .insert(userTable)
            .values({
              id,
              username: nick || username,
              roles: roles,
              accessToken: tokens.accessToken(),
              refreshToken: tokens.refreshToken(),
              accessTokenExpiresAt: tokens.accessTokenExpiresAt(),
            })
            .onConflictDoUpdate({
              target: userTable.id,
              set: buildConflictUpdateColumns(userTable, updateColumns),
              setWhere: buildSetWhereColumns(userTable, updateColumns),
            })
            .returning(),
        );

        if (userUpdateError) {
          logger.error("Failed to update or insert user data", userUpdateError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        const sessionToken = generateSessionToken();

        const [session, sessionError] = await trytm(
          createSession(c as unknown as ServerContext, sessionToken, id),
        );

        if (sessionError) {
          logger.error("Failed to create session", sessionError);
          return new Response(null, {
            status: 302,
            headers,
          });
        }

        setSessionTokenCookie(sessionToken, session.expiresAt);

        if (isTauri)
          headers.set("Location", `attendance://login?token=${sessionToken}`);

        logger.info(
          `User ${nick || username} (${id}) authenticated successfully`,
        );

        return new Response(null, { headers, status: 302 });
      },
    },
  },
});
