import env from "@/server/env";
import { RSVPStatusUpdateSchema } from "@/server/schema/RSVPStatusSchema";
import type { RSVPUserSchema } from "@/server/schema/RSVPUserSchema";
import { generateMessage } from "@/server/services/botService";
import {
  editUserRsvpStatus,
  getAutocompleteEvents,
  getEvent,
  getEventRsvps,
  getEventSecret,
  selfCheckin,
  userCheckout,
} from "@/server/services/events.service";
import { createUser } from "@/server/services/user.service";
import { trytm } from "@/utils/trytm";
import {
  ActionRowBuilder,
  EmbedBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
} from "@discordjs/builders";
import {
  type APIApplicationCommandInteractionDataStringOption,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ComponentType,
  InteractionType,
  MessageFlags,
  TextInputStyle,
} from "@discordjs/core";
import { createFileRoute } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { match } from "path-to-regexp";
import { z } from "zod";
import { discordMiddleware } from "../../middleware/discordMiddleware";
import { requestRSVPCommand } from "./-interaction/commands/requestRSVP";
import { syncplzCommand } from "./-interaction/commands/syncplz";
import {
  autocompleteReply,
  modalReply,
  reply,
  updateMessage,
} from "./-interaction/interactionReply";

const statusToEmoji = (status: z.infer<typeof RSVPUserSchema>["status"]) => {
  switch (status) {
    case "YES":
      return ":white_check_mark:";
    case "NO":
      return ":x:";
    case "MAYBE":
      return ":grey_question:";
    case "LATE":
      return ":clock3:";
    case "ATTENDED":
      return ":ok:";
    default:
      return "";
  }
};

function rsvpToDescription(
  username: string,
  status: z.infer<typeof RSVPUserSchema>["status"],
) {
  return `${username} - ${statusToEmoji(status)}`;
}

export const Route = createFileRoute("/api/interaction")({
  server: {
    middleware: [discordMiddleware],
    handlers: {
      POST: async ({ context: c }) => {
        const { db, interaction, logger } = c;
        if (!env.GUILD_ID) throw new Error("Guild Id not defined");
        if (
          interaction.member === undefined ||
          interaction.guild_id !== env.GUILD_ID
        ) {
          logger.debug(
            "Interaction is not from a guild member or guild ID does not match",
          );
          return reply({
            content: "You must be a guild member to use this command.",
            flags: MessageFlags.Ephemeral,
          });
        }

        /**
         * Handle application command interactions.
         */
        if (
          interaction.type === InteractionType.ApplicationCommand &&
          interaction.data.type === ApplicationCommandType.ChatInput
        ) {
          /**
           * Respond to typical slash commands
           */
          logger.debug(
            `Processing chat input command: ${interaction.data.name}`,
          );

          switch (interaction.data.name) {
            case "ping":
              return reply({
                content: "Pong!",
              });
            case "syncplz":
              return syncplzCommand(c, interaction.data);
            case "requestrsvp":
              return requestRSVPCommand(c, interaction.data, db);
            default:
              logger.debug(`Unknown command: ${interaction.data.name}`);
              return reply({
                content: "Unknown command.",
                flags: MessageFlags.Ephemeral,
              });
          }
        }

        /**
         * Handle message component interactions.
         */
        if (interaction.type === InteractionType.MessageComponent) {
          /**
           * Handle button interactions.
           */
          if (interaction.data.component_type === ComponentType.Button) {
            logger.debug(
              `Processing button interaction with custom ID: ${interaction.data.custom_id}`,
            );
            const { custom_id: customId } = interaction.data;

            /**
             * RSVPs button.
             */
            const rsvpsFn = match("event/:eventId/rsvps");
            const rsvpsButtonMatch = rsvpsFn(customId);

            if (rsvpsButtonMatch !== false) {
              const paramObject = await z
                .object({
                  eventId: z.string(),
                })
                .safeParseAsync(rsvpsButtonMatch.params);

              if (!paramObject.success) {
                return reply({
                  content: "Invalid RSVP status.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { eventId } = paramObject.data;

              const [rsvpEvent, eventErr] = await trytm(getEvent(c, eventId));

              if (eventErr) {
                return reply({
                  content: "Failed to fetch event details.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const [eventRsvps, rsvpsErr] = await trytm(
                getEventRsvps(c, eventId),
              );

              if (rsvpsErr) {
                return reply({
                  content: "Failed to fetch event RSVPs.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const description = eventRsvps
                .map((rsvp) =>
                  rsvpToDescription(rsvp.user.username, rsvp.status),
                )
                .join("\n");

              const rsvpEmbed = new EmbedBuilder()
                .setTitle(
                  `RSVPs for ${rsvpEvent.title} at ${DateTime.fromJSDate(
                    rsvpEvent.startDate,
                  ).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY)}`,
                )
                .setDescription(description)
                .setTimestamp(new Date())
                .setURL(`${env.VITE_URL}/event/${rsvpEvent.id}`);

              return reply({
                flags: MessageFlags.Ephemeral,
                embeds: [rsvpEmbed.toJSON()],
              });
            }

            /**
             * RSVP button.
             */
            const rsvpFn = match("event/:eventId/rsvp/:rsvpStatus");

            const rsvpButtonMatch = rsvpFn(customId);
            if (rsvpButtonMatch !== false) {
              const paramObject = await z
                .object({
                  eventId: z.string(),
                  rsvpStatus: RSVPStatusUpdateSchema,
                })
                .safeParseAsync(rsvpButtonMatch.params);

              if (!paramObject.success) {
                return reply({
                  content: "Invalid RSVP status.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { eventId, rsvpStatus } = paramObject.data;

              const [fetchedEvent, fetchedEventErr] = await trytm(
                getEvent(c, eventId),
              );

              if (fetchedEventErr || !fetchedEvent) {
                return reply({
                  content: "Failed to fetch event details.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { member } = interaction;

              if (!member) {
                return reply({
                  content: "You must be a guild member to RSVP.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { roles, user, nick } = member;

              const username = nick ?? user.username;

              const [_userUpsert, userUpsertErr] = await trytm(
                createUser(c, {
                  id: user.id,
                  username,
                  roles,
                }),
              );

              if (userUpsertErr) {
                return reply({
                  content: "Failed to create user.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { ruleId } = fetchedEvent;

              if (ruleId !== null) {
                const [rule, ruleGetError] = await trytm(
                  db.query.eventParsingRuleTable.findFirst({
                    where: (table, { eq }) => eq(table.id, ruleId),
                  }),
                );

                if (ruleGetError || !rule) {
                  return reply({
                    content: "Failed to fetch event parsing rules.",
                    flags: MessageFlags.Ephemeral,
                  });
                }

                const { roleIds: ruleRoles } = rule;

                roles.push(env.GUILD_ID);

                // if there's no overlap between the user's roles and the rule roles, return an error
                const hasRole = roles.some((role) => ruleRoles.includes(role));

                if (!hasRole && ruleRoles.length > 0) {
                  return reply({
                    content:
                      "You do not have permission to RSVP to this event.",
                    flags: MessageFlags.Ephemeral,
                  });
                }
              }

              if (rsvpStatus === "LATE") {
                const delayModal = new ModalBuilder()
                  .setTitle("Delay")
                  .setCustomId(`event/${eventId}/delay`)
                  .setComponents([
                    new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                      [
                        new TextInputBuilder()
                          .setCustomId("delay")
                          .setPlaceholder("Delay")
                          .setLabel("Delay (in minutes)")
                          .setStyle(TextInputStyle.Short),
                      ],
                    ),
                  ]);

                return modalReply(delayModal.toJSON());
              }

              const [_, err] = await trytm(
                editUserRsvpStatus(c, user.id, {
                  eventId,
                  status: rsvpStatus,
                }),
              );

              if (err) {
                return reply({
                  content: "Failed to update RSVP status.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const [generatedMessage, genMsgErr] = await trytm(
                generateMessage(db, eventId),
              );

              if (genMsgErr) {
                return reply({
                  content: "Failed to generate RSVP message.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              return updateMessage({
                content: generatedMessage.content,
                embeds: generatedMessage.embeds,
                components: generatedMessage.components,
                allowed_mentions: generatedMessage.allowed_mentions,
              });
            }

            /**
             * Check-in button.
             */
            const checkinFn = match("event/:eventId/checkin");
            const checkinButtonMatch = checkinFn(customId);
            if (checkinButtonMatch !== false) {
              const paramObject = await z
                .object({
                  eventId: z.string(),
                })
                .safeParseAsync(checkinButtonMatch.params);
              if (!paramObject.success) {
                return reply({
                  content: "Invalid event ID.",
                  flags: MessageFlags.Ephemeral,
                });
              }
              const { eventId } = paramObject.data;

              const checkinModal = new ModalBuilder()
                .setTitle("Checkin")
                .setCustomId(`event/${eventId}/checkin`)
                .setComponents([
                  new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
                    [
                      new TextInputBuilder()
                        .setCustomId("code")
                        .setPlaceholder("8 digit code")
                        .setRequired(true)
                        .setMinLength(8)
                        .setMaxLength(8)
                        .setLabel("The event code")
                        .setStyle(TextInputStyle.Short),
                    ],
                  ),
                ]);

              return modalReply(checkinModal.toJSON());
            }

            /**
             * Check out button.
             */
            const checkoutFn = match("event/:eventId/checkout");
            const checkoutButtonMatch = checkoutFn(customId);
            if (checkoutButtonMatch !== false) {
              const paramObject = await z
                .object({
                  eventId: z.string(),
                })
                .safeParseAsync(checkoutButtonMatch.params);

              if (!paramObject.success) {
                return reply({
                  content: "Invalid event ID.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const { eventId } = paramObject.data;

              const { member } = interaction;

              if (!member) {
                return reply({
                  content: "You must be a guild member to check out.",
                  flags: MessageFlags.Ephemeral,
                });
              }

              const [_, checkoutErr] = await trytm(
                userCheckout(c, member.user.id, eventId),
              );

              if (checkoutErr) {
                return reply({
                  content: "Failed to check out.",
                  flags: MessageFlags.Ephemeral,
                });
              }
              const [generatedMessage, genMsgErr] = await trytm(
                generateMessage(db, eventId),
              );
              if (genMsgErr) {
                return reply({
                  content: "Failed to generate RSVP message.",
                  flags: MessageFlags.Ephemeral,
                });
              }
              return updateMessage({
                content: generatedMessage.content,
                embeds: generatedMessage.embeds,
                components: generatedMessage.components,
                allowed_mentions: generatedMessage.allowed_mentions,
              });
            }
          }
        }

        if (interaction.type === InteractionType.ModalSubmit) {
          logger.debug(
            `Processing modal submit interaction with custom ID: ${interaction.data.custom_id}`,
          );
          const { custom_id: customId } = interaction.data;

          /**
           * Late RSVP modal.
           * This modal is triggered when a user clicks the "Late" button in the RSVP message.
           */
          const delayFn = match("event/:eventId/delay");
          const delayMatch = delayFn(customId);
          if (delayMatch !== false) {
            const paramObject = await z
              .object({
                eventId: z.string(),
              })
              .safeParseAsync(delayMatch.params);

            if (!paramObject.success) {
              return reply({
                content: "Invalid event ID.",
                flags: MessageFlags.Ephemeral,
              });
            }

            const { eventId } = paramObject.data;

            const delay = interaction.data.components
              .filter((row) => row.type === ComponentType.ActionRow)
              .flatMap((componentRow) => componentRow.components)
              .find(
                (component) =>
                  component.type === ComponentType.TextInput &&
                  component.custom_id === "delay",
              )?.value;

            const parsedValueSchema = await z.coerce
              .number()
              .int()
              .min(0, "Delay must be a positive number")
              .safeParseAsync(delay);

            if (!parsedValueSchema.success) {
              return reply({
                content: parsedValueSchema.error
                  .flatten()
                  .formErrors.join(", "),
                flags: MessageFlags.Ephemeral,
              });
            }

            const { data: value } = parsedValueSchema;

            const [eventData, eventDataError] = await trytm(
              getEvent(c, eventId),
            );

            if (eventDataError || !eventData) {
              return reply({
                content: "Failed to fetch event details.",
                flags: MessageFlags.Ephemeral,
              });
            }

            const startDateTime = DateTime.fromJSDate(eventData.startDate);

            const { member } = interaction;
            if (!member) {
              return reply({
                content: "You must be a guild member to RSVP.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const { user } = member;

            const arrivingAt =
              startDateTime.plus({ minutes: value }).toJSDate() ?? undefined;

            const [_updatedRsvp, updateRsvpError] = await trytm(
              editUserRsvpStatus(c, user.id, {
                eventId,
                status: "LATE",
                arrivingAt,
              }),
            );

            if (updateRsvpError) {
              return reply({
                content: "Failed to update RSVP status.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const [generatedMessage, genMsgErr] = await trytm(
              generateMessage(db, eventId),
            );
            if (genMsgErr) {
              return reply({
                content: "Failed to generate RSVP message.",
                flags: MessageFlags.Ephemeral,
              });
            }
            return updateMessage({
              content: generatedMessage.content,
              embeds: generatedMessage.embeds,
              components: generatedMessage.components,
              allowed_mentions: generatedMessage.allowed_mentions,
            });
          }

          /**
           * Self check-in modal.
           * This modal is triggered when a user clicks the "Check In" button in the RSVP message.
           */
          const checkinFn = match("event/:eventId/checkin");
          const checkinMatch = checkinFn(customId);
          if (checkinMatch !== false) {
            const code = interaction.data.components
              .filter((row) => row.type === ComponentType.ActionRow)
              .flatMap((componentRow) => componentRow.components)
              .find(
                (component) =>
                  component.type === ComponentType.TextInput &&
                  component.custom_id === "code",
              )?.value;

            const paramObject = await z
              .object({
                eventId: z.string(),
              })
              .safeParseAsync(checkinMatch.params);

            if (!paramObject.success) {
              return reply({
                content: "Invalid event ID.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const { eventId } = paramObject.data;

            const [secret, secretErr] = await trytm(getEventSecret(c, eventId));

            if (secretErr || !secret) {
              return reply({
                content: "Failed to fetch event secret.",
                flags: MessageFlags.Ephemeral,
              });
            }

            if (secret.secret !== code) {
              return reply({
                content: "Invalid code.",
                flags: MessageFlags.Ephemeral,
              });
            }

            const { member } = interaction;

            if (!member) {
              return reply({
                content: "You must be a guild member to check in.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const { roles, user, nick } = member;
            const username = nick ?? user.username;
            const [_userUpsert, userUpsertErr] = await trytm(
              createUser(c, {
                id: user.id,
                username,
                roles,
              }),
            );
            if (userUpsertErr) {
              return reply({
                content: "Failed to create user.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const [_checkinResponse, checkinErr] = await trytm(
              selfCheckin(c, user.id, {
                eventId,
                secret: secret.secret,
              }),
            );
            if (checkinErr) {
              return reply({
                content: "Failed to check in.",
                flags: MessageFlags.Ephemeral,
              });
            }
            const [generatedMessage, genMsgErr] = await trytm(
              generateMessage(db, eventId),
            );
            if (genMsgErr) {
              return reply({
                content: "Failed to generate RSVP message.",
                flags: MessageFlags.Ephemeral,
              });
            }
            return updateMessage({
              content: generatedMessage.content,
              embeds: generatedMessage.embeds,
              components: generatedMessage.components,
              allowed_mentions: generatedMessage.allowed_mentions,
            });
          }
        }

        if (
          interaction.type === InteractionType.ApplicationCommandAutocomplete
        ) {
          logger.debug(
            `Processing autocomplete interaction for command: ${interaction.data.name}`,
          );
          if (interaction.data.name === "requestrsvp") {
            const meetingStringOption = interaction.data.options?.find(
              (option) =>
                option.type === ApplicationCommandOptionType.String &&
                option.name === "meeting",
            ) as APIApplicationCommandInteractionDataStringOption | undefined;

            if (!meetingStringOption) {
              return autocompleteReply({
                choices: [],
              });
            }

            const query = meetingStringOption.value.toLowerCase();

            const [events, err] = await trytm(getAutocompleteEvents(c, query));

            if (err) {
              logger.error("Failed to get autocomplete events", err);
              return autocompleteReply({
                choices: [],
              });
            }

            const choices = events.map((event) => {
              const localStart = DateTime.fromJSDate(event.startDate, {
                zone: env.TZ,
              }).toLocaleString(DateTime.DATETIME_SHORT, {
                locale: interaction.locale,
              });

              return {
                name: `${event.title} - ${localStart}`,
                value: event.id,
              };
            });

            return autocompleteReply({
              choices,
            });
          }
        }
      },
    },
  },
});
// function registerButtonHandler<T extends $ZodType>(pattern: string, schema: T, handler: (params: z.output<T>) => Promise<JSONReply | JSONUpdateMessage | JSONModalReply>) {

// }
