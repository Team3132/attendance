import { LinkButton } from "@/components/LinkButton";
import { LinkMenuItem } from "@/components/LinkMenuItem";
import useDeleteRule from "@/features/admin/hooks/useDeleteRule";
import useDeployCommands from "@/features/admin/hooks/useDeployCommands";
import useSyncCalendar from "@/features/admin/hooks/useSyncCalendar";
import useTriggerRule from "@/features/admin/hooks/useTriggerRule";
import { adminQueries } from "@/queries/adminQueries";
import type { ParsingRule } from "@/server/drizzle/schema";
import { getLocale } from "@/utils/dt";
import {
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DateTime } from "luxon";

import { useCallback, useState } from "react";
import { FaCopy, FaPen, FaPlay, FaTrash } from "react-icons/fa6";
import { MdMoreVert } from "react-icons/md";

export const Route = createFileRoute("/_authenticated/admin_/event-parsing/")({
  head: () => ({
    meta: [
      {
        title: "Admin - Event Parsing",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(adminQueries.eventParsingRules);
  },
  component: RouteComponent,
  wrapInSuspense: true,
});

function RouteComponent() {
  const parsingRulesQuery = useSuspenseQuery(adminQueries.eventParsingRules);

  return (
    <>
      <List>
        {parsingRulesQuery.data.map((rule) => (
          <ParsingRuleListItem key={rule.id} rule={rule} />
        ))}
      </List>
      <Stack direction={"row"} sx={{ gap: 2 }}>
        <SyncEventsButton />
        <DeployDiscordCommandsButton />
        <LinkButton to="/admin/event-parsing/create">Create Rule</LinkButton>
      </Stack>
    </>
  );
}

function ParsingRuleListItem(props: { rule: ParsingRule }) {
  const { rule } = props;

  return (
    <ListItem
      disablePadding
      key={rule.id}
      secondaryAction={<EventParsingMenu rule={rule} />}
    >
      <ListItemText
        primary={rule.name}
        secondary={`Priority: ${rule.priority}, Last Run: ${rule.lastRun === null ? "Never" : DateTime.fromJSDate(rule.lastRun).toLocaleString(DateTime.DATETIME_MED, { locale: getLocale() })}`}
      />
    </ListItem>
  );
}

interface EventParsingMenuProps {
  rule: ParsingRule;
}

function EventParsingMenu(props: EventParsingMenuProps) {
  const { rule } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const deleteRuleMutation = useDeleteRule();
  const triggerRuleMutation = useTriggerRule();

  const handleDeleteRule = useCallback(
    () =>
      deleteRuleMutation.mutate({ data: rule.id }, { onSettled: handleClose }),
    [deleteRuleMutation.mutate, rule.id, handleClose],
  );

  const handleTriggerRule = useCallback(
    () =>
      triggerRuleMutation.mutate({ data: rule.id }, { onSettled: handleClose }),
    [triggerRuleMutation.mutate, rule.id, handleClose],
  );

  return (
    <>
      <IconButton onClick={handleClick}>
        <MdMoreVert />
      </IconButton>
      <Menu open={open} onClose={handleClose} anchorEl={anchorEl}>
        <MenuItem
          onClick={handleTriggerRule}
          disabled={triggerRuleMutation.isPending}
        >
          <ListItemIcon>
            <FaPlay fontSize="small" />
          </ListItemIcon>
          <ListItemText>Trigger</ListItemText>
        </MenuItem>
        <LinkMenuItem
          to="/admin/event-parsing/$ruleId"
          params={{ ruleId: rule.id }}
        >
          <ListItemIcon>
            <FaPen fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </LinkMenuItem>
        <LinkMenuItem
          to="/admin/event-parsing/create"
          params={{
            name: `${rule.name} (Copy)`,
            regex: rule.regex,
            roleIds: rule.roleIds,
            cronExpr: rule.cronExpr,
            channelId: rule.channelId,
            priority: rule.priority,
            isOutreach: rule.isOutreach,
          }}
        >
          <ListItemIcon>
            <FaCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </LinkMenuItem>
        <Divider />
        <MenuItem
          onClick={handleDeleteRule}
          disabled={deleteRuleMutation.isPending}
        >
          <ListItemIcon>
            <FaTrash fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

function SyncEventsButton() {
  const syncEventsMutation = useSyncCalendar();
  const syncEvents = () => syncEventsMutation.mutate();

  return (
    <Button
      onClick={syncEvents}
      loading={syncEventsMutation.isPending}
      variant="contained"
    >
      Sync Events
    </Button>
  );
}

function DeployDiscordCommandsButton() {
  const deployCommandsMutation = useDeployCommands();
  const deployCommands = () => deployCommandsMutation.mutate({});

  return (
    <Button
      onClick={deployCommands}
      loading={deployCommandsMutation.isPending}
      variant="contained"
      color="secondary"
    >
      Deploy Discord Commands
    </Button>
  );
}
