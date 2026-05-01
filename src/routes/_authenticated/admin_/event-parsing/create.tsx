import ControlledAutocomplete from "@/components/ControlledAutocomplete";
import ControlledCheckbox from "@/components/ControlledCheckbox";
import ControlledTextField from "@/components/ControlledTextField";
import useCreateRule from "@/features/admin/hooks/useCreateRule";
import { discordQueryOptions } from "@/queries/discord.queries";
import { strToRegex } from "@/server/utils/regexBuilder";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Divider, Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CronPattern } from "croner";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export const Route = createFileRoute(
  "/_authenticated/admin_/event-parsing/create",
)({
  validateSearch: z.object({
    name: z.string().optional(),
    channelId: z.string().optional(),
    priority: z.number().int().max(100).min(0).optional(),
    regex: z
      .string()
      .refine((v) => {
        try {
          strToRegex(v);
          return true;
        } catch {
          return false;
        }
      })
      .optional(),
    roleIds: z.array(z.string()).optional(),
    cronExpr: z
      .string()
      .superRefine((v, ctx) => {
        try {
          new CronPattern(v);
        } catch (e) {
          if (e instanceof TypeError) {
            ctx.addIssue({
              code: "custom",
              message: e.message,
              input: v,
            });
          }
        }
      })
      .optional(),
    isOutreach: z.boolean().optional(),
  }),
  head: () => ({
    meta: [
      {
        title: "Admin - Create Rule",
      },
    ],
  }),
  component: RouteComponent,
  wrapInSuspense: true,
});

const OptionSchema = z.object({
  label: z.string().nonempty(),
  value: z.string().nonempty(),
});

const NewEventParsingRuleFormSchema = z.object({
  channel: OptionSchema.nullable(),
  name: z.string().min(1),
  priority: z.coerce.number().int().min(0).max(100),
  regex: z
    .string()
    .min(3)
    .refine((v) => {
      try {
        strToRegex(v);
        return true;
      } catch {
        return false;
      }
    }),
  roles: z.array(OptionSchema).min(1),
  cronExpr: z.string().superRefine((v, ctx) => {
    try {
      new CronPattern(v);
    } catch (e) {
      if (e instanceof TypeError) {
        ctx.addIssue({
          code: "custom",
          message: e.message,
          input: v,
        });
      }
    }
  }),
  isOutreach: z.boolean(),
});

function RouteComponent() {
  const searchParams = Route.useSearch();

  const channelsQuery = useSuspenseQuery(discordQueryOptions.serverChannels());

  const channelOptions = useMemo(
    () =>
      channelsQuery.data.map((c) => ({
        label: `#${c.name}`,
        value: c.id,
      })),
    [channelsQuery.data],
  );

  const rolesQuery = useSuspenseQuery(discordQueryOptions.serverRoles());

  const roleOptions = useMemo(
    () =>
      rolesQuery.data.map((c) => ({
        label: c.name,
        value: c.id,
      })),
    [rolesQuery.data],
  );

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(NewEventParsingRuleFormSchema),
    defaultValues: {
      channel: searchParams.channelId
        ? channelOptions.find((c) => c.value === searchParams.channelId)
        : null,
      cronExpr: searchParams.cronExpr ?? "",
      name: searchParams.name ?? "",
      regex: searchParams.regex ?? "",
      roles: searchParams.roleIds
        ? roleOptions.filter((r) => searchParams.roleIds?.includes(r.value))
        : [],
      priority: searchParams.priority ?? 0,
      isOutreach: searchParams.isOutreach ?? false,
    },
  });

  const createRuleMutation = useCreateRule();

  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (data) => {
    const newRule = await createRuleMutation.mutateAsync({
      data: {
        ...data,
        channelId: data.channel?.value as string,
        roleIds: data.roles.map((r) => r.value),
      },
    });

    navigate({
      to: "/admin/event-parsing/$ruleId",
      params: {
        ruleId: newRule.id,
      },
    });
  });

  return (
    <>
      <Stack component={"form"} sx={{ gap: 2 }} onSubmit={onSubmit}>
        <Typography variant="h4">Create Event Parsing Rule</Typography>
        <Typography>
          Create a rule that matches a regex and posts a reminder in a channel
          pinging specific roles
        </Typography>
        <Divider />
        <ControlledTextField
          control={control}
          name="name"
          label="Name"
          helperText="The name of the rule (purely aesthetic)"
        />
        <ControlledTextField
          control={control}
          name="regex"
          label="Regex"
          helperText="Get a software student to help write a text-matching rule"
        />
        <ControlledTextField
          control={control}
          name="cronExpr"
          label="Cron Expression"
          helperText="Use https://crontab.guru/ to help you create a cron expression, this is the schedule for when the rule will run"
        />
        <ControlledAutocomplete
          control={control}
          name="channel"
          label="Channel"
          options={channelOptions}
          helperText="The channel where event reminders matching the regex will be posted"
        />
        <ControlledAutocomplete
          control={control}
          name="roles"
          label="Roles"
          options={roleOptions}
          multiple
          helperText="The roles that will be pinged when the event reminder is posted"
        />
        <ControlledTextField
          control={control}
          name="priority"
          label="Priority"
          type="number"
          rules={{}}
          helperText="The higher the number, the higher the priority"
        />
        <ControlledCheckbox
          control={control}
          name="isOutreach"
          label="Counts for Outreach?"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          loading={isSubmitting}
        >
          Submit
        </Button>
      </Stack>
    </>
  );
}
