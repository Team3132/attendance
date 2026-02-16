import { trytm } from "@/utils/trytm";
import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  roleMention,
  time,
} from "@discordjs/builders";
import {
  ButtonStyle,
  type RESTPostAPIChannelMessageJSONBody,
} from "@discordjs/core";
import { createServerOnlyFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import type { z } from "zod";
import type { DB } from "../drizzle/db";
import { eventTable, rsvpTable, userTable } from "../drizzle/schema";
import env from "../env";
import type { RSVPUserSchema } from "../schema/RSVPUserSchema";

const statusToEmoji = (
  status: z.infer<typeof RSVPUserSchema>["status"],
  delay?: string,
) => {
  switch (status) {
    case "YES":
      return ":white_check_mark:";
    case "NO":
      return ":x:";
    case "MAYBE":
      return ":grey_question:";
    case "LATE":
      return delay ? `:clock3: - ${delay} late` : ":clock3:";
    case "ATTENDED":
      return ":ok:";
    default:
      return "";
  }
};

/**
 * Generates an announcement message for an event
 * @param data The data to generate the message with
 * @returns The message data
 */
export const generateMessage = createServerOnlyFn(
  async (db: DB, eventId: string) => {
    if (!env.GUILD_ID) throw new Error("Guild Id not defined");

    const [eventRSVPs, eventRsvpsError] = await trytm(
      db
        .select({
          arrivingAt: rsvpTable.arrivingAt,
          status: rsvpTable.status,
          user: {
            username: userTable.username,
            roles: userTable.roles,
            id: userTable.id,
          },
        })
        .from(rsvpTable)
        .innerJoin(userTable, eq(rsvpTable.userId, userTable.id))
        .where(eq(rsvpTable.eventId, eventId))
        .orderBy(asc(userTable.username)),
    );

    if (eventRsvpsError) {
      throw new Error("Error fetching RSVPs");
    }

    const [eventData, eventDataError] = await trytm(
      db.query.eventTable.findFirst({
        where: eq(eventTable.id, eventId),
        with: {
          rule: {
            columns: {
              roleIds: true,
            },
          },
        },
      }),
    );

    if (eventDataError) {
      throw new Error("Error fetching event");
    }

    if (!eventData) {
      throw new Error("Event not found");
    }

    const roleIds = eventData.rule?.roleIds ?? [env.GUILD_ID];

    /** A list of role mentionds seperated by commas and "and" at the end */
    const roleMentionList = listToText(roleIds.map(roleMention));

    const meetingInfo = new EmbedBuilder({
      description: eventData.description.length
        ? eventData.description
        : undefined,
    })
      .setTitle(eventData.title)
      .addFields(
        {
          name: "Roles",
          value: roleMentionList,
          inline: true,
        },
        {
          name: "Start Time",
          value: time(eventData.startDate, "F"),
          inline: true,
        },
        {
          name: "End Time",
          value: time(eventData.endDate, "F"),
          inline: true,
        },
      )
      .setURL(`${env.VITE_URL}/events/${eventData.id}`)
      .setColor([49, 49, 96]);

    const eventStart = DateTime.fromJSDate(eventData.startDate);

    const rsvpGroups: Record<string, typeof eventRSVPs> = {};

    for (const eventRSVP of eventRSVPs) {
      const roleId = roleIds.find((roleId) =>
        eventRSVP.user.roles?.concat(env.GUILD_ID as string)?.includes(roleId),
      );

      if (roleId) {
        if (!rsvpGroups[roleId]) {
          rsvpGroups[roleId] = []; // Theoretically never triggered but safe.
        }

        rsvpGroups[roleId].push(eventRSVP);
      }
    }

    const embeds = [meetingInfo]
      .concat(
        roleIds
          .filter((roleId) => rsvpGroups[roleId]?.length) // Filter out roles with no RSVPs
          .map((roleId) =>
            rsvpsToEmbed(rsvpGroups[roleId], eventStart, roleId),
          ),
      )
      .map((embed) => embed.toJSON());

    const components = makeRsvpButtons(eventId);

    return {
      content: `Please RSVP (${roleMentionList})`,
      embeds,
      components: [components.toJSON()],
      allowed_mentions: {
        roles: roleIds,
      },
    } satisfies RESTPostAPIChannelMessageJSONBody;
  },
);

const listToText = (list: string[]) =>
  list.length > 1
    ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`
    : list[0];

function rsvpToString(eventStart: DateTime<true> | DateTime<false>): (value: {
  arrivingAt: Date | null;
  status: "LATE" | "MAYBE" | "NO" | "YES" | "ATTENDED" | null;
  user: { username: string };
}) => string {
  return (rawRsvp) => {
    const arrivingAt = rawRsvp.arrivingAt
      ? DateTime.fromJSDate(rawRsvp.arrivingAt)
      : null;

    const delay =
      arrivingAt?.isValid && eventStart
        ? arrivingAt.diff(eventStart, "minutes").rescale().toHuman()
        : undefined;

    return `${rawRsvp.user.username} - ${statusToEmoji(rawRsvp.status, delay)}`;
  };
}

const makeRsvpButtons = (eventId: string) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`event/${eventId}/rsvp/${"YES"}`)
      .setStyle(ButtonStyle.Success)
      .setLabel("Coming"),
    new ButtonBuilder()
      .setCustomId(`event/${eventId}/rsvp/${"MAYBE"}`)
      .setStyle(ButtonStyle.Secondary)
      .setLabel("Maybe"),
    new ButtonBuilder()
      .setCustomId(`event/${eventId}/rsvp/${"NO"}`)
      .setStyle(ButtonStyle.Danger)
      .setLabel("Not Coming"),
    new ButtonBuilder()
      .setCustomId(`event/${eventId}/rsvp/${"LATE"}`)
      .setStyle(ButtonStyle.Primary)
      .setLabel("Late"),
    new ButtonBuilder()
      .setCustomId(`event/${eventId}/checkin`)
      .setStyle(ButtonStyle.Primary)
      .setLabel("Check In"),
  );

function rsvpsToEmbed(
  rsvps: Array<{
    arrivingAt: Date | null;
    status: "LATE" | "MAYBE" | "NO" | "YES" | "ATTENDED" | null;
    user: { username: string };
  }>,
  eventStart: DateTime<true> | DateTime<false>,
  roleId?: string,
): EmbedBuilder {
  const count = rsvps.filter(
    (rsvp) => rsvp.status === "YES" || rsvp.status === "LATE",
  ).length;
  const rsvpTitle = roleId
    ? `### ${roleMention(roleId)} (${count})`
    : `### No Role (${count})`;

  const rsvpsContent = rsvps.map(rsvpToString(eventStart)).join("\n");

  const content = `${rsvpTitle}\n${rsvpsContent}`;

  const embed = new EmbedBuilder().setDescription(content);
  return embed;
}
