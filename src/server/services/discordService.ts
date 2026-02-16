import { adminMiddleware } from "@/middleware/authMiddleware";
import { logger } from "@/utils/logger";
import { trytm } from "@/utils/trytm";
import { SlashCommandBuilder } from "@discordjs/builders";
import {
  API,
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
} from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import env from "../env";

/**
 * Get the API instance for the bot
 * @returns The API instance for the bot
 */
export const getDiscordBotAPI = createServerOnlyFn(() => {
  if (!env.DISCORD_TOKEN) {
    throw new Error("Discord not configured!");
  }

  const rest = new REST({ version: "10", authPrefix: "Bot" }).setToken(
    env.DISCORD_TOKEN,
  );

  const api = new API(rest);

  return api;
});

/**
 * Get the roles of a guild the user is in
 * @param userId The ID of the current user
 */
export const getServerRoles = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const guildId = env.GUILD_ID;
    if (!guildId) throw new Error("No guild Id defined.");
    const api = await getDiscordBotAPI();

    const [guildRoles, rolesFetchError] = await trytm(
      api.guilds.getRoles(guildId),
    );

    if (rolesFetchError) {
      setResponseStatus(500);
      throw new Error("Error fetching roles from Discord API", {
        cause: rolesFetchError,
      });
    }

    // return in name, id format
    return guildRoles.map(({ name, id }) => ({ name, id }));
  });

/**
 * Get the channels of a guild the user is in
 * @param userId The ID of the current user
 * @returns The channels of the guild
 */
export const getServerChannels = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const guildId = env.GUILD_ID;
    if (!guildId) throw new Error("Guild Id not defined");
    const api = await getDiscordBotAPI();

    const [channels, channelFetchError] = await trytm(
      api.guilds.getChannels(guildId),
    );

    if (channelFetchError) {
      setResponseStatus(500);
      throw new Error("Error fetching channels from Discord API", {
        cause: channelFetchError,
      });
    }

    const textChannels = channels.filter(
      (channel) => channel.type === ChannelType.GuildText,
    );

    // return in name, id format
    return textChannels.map(({ name, id }) => ({ name, id }));
  });

export const deployCommands = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    if (!env.DISCORD_TOKEN || !env.DISCORD_CLIENT_ID || !env.GUILD_ID) {
      throw new Error("Discord bot not configured!");
    }

    const rest = new REST().setToken(env.DISCORD_TOKEN);

    const api = new API(rest);

    const [data, err] = await trytm(
      api.applicationCommands.bulkOverwriteGuildCommands(
        env.DISCORD_CLIENT_ID,
        env.GUILD_ID,
        [
          new SlashCommandBuilder()
            .setName("syncplz")
            .setDescription(
              "Send a humble request to the bot to sync the calendar.",
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .setContexts(InteractionContextType.Guild)
            .toJSON(),
          new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Ping the bot to check if it's online.")
            .toJSON(),
          new SlashCommandBuilder()
            .setName("requestrsvp")
            .setDescription(
              "Send a message for people to RSVP to a specific event.",
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .setContexts(InteractionContextType.Guild)
            .addStringOption((option) =>
              option
                .setAutocomplete(true)
                .setName("meeting")
                .setDescription("The event to RSVP to")
                .setRequired(true),
            )
            .toJSON(),
          new SlashCommandBuilder()
            .setName("leaderboard")
            .setDescription("Get the leaderboard for outreach hours")
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
            .setContexts(InteractionContextType.Guild)
            .toJSON(),
        ],
      ),
    );

    if (err) {
      setResponseStatus(500);
      throw new Error("Error deploying commands", {
        cause: err,
      });
    }
    logger.success("Successfully deployed commands:", data);

    return;
  });
