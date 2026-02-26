import { authMutationOptions } from "@/queries/auth.queries";
import { usersQueryOptions } from "@/queries/users.queries";
import { getLocale } from "@/utils/dt";
import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DateTime } from "luxon";
import { Suspense, useCallback } from "react";
import { MdDelete } from "react-icons/md";

export const Route = createFileRoute("/_authenticated/profile/sessions")({
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userSelfSessions());
  },
  component: RouteComponent,
  wrapInSuspense: true,
});

function RouteComponent() {
  return (
    <Suspense fallback={<SkeletonSessionList />}>
      <SessionList />
    </Suspense>
  );
}

const listItems = new Array(10).map((_, i) => i);

function SkeletonSessionList() {
  return (
    <List>
      {listItems.map((i) => (
        <ListItem key={i}>
          <ListItemText primary={<Skeleton />} />
        </ListItem>
      ))}
    </List>
  );
}

function SessionList() {
  const sessions = useSuspenseQuery(usersQueryOptions.userSelfSessions());
  return (
    <List>
      {sessions.data.map((session) => (
        <ListItem
          key={session.id}
          secondaryAction={<RevokeSessionButton id={session.id} />}
        >
          <ListItemText
            primary={DateTime.fromJSDate(session.expiresAt).toLocaleString(
              DateTime.DATETIME_MED,
              { locale: getLocale() },
            )}
          />
        </ListItem>
      ))}
    </List>
  );
}

interface RevokeSessionButtonProps {
  id: string;
}

function RevokeSessionButton(props: RevokeSessionButtonProps) {
  const { id } = props;

  const revokeSelfSessionMutation = useMutation(
    authMutationOptions.revokeSelfSession,
  );

  const handleClick = useCallback(() => {
    revokeSelfSessionMutation.mutate({
      data: id,
    });
  }, [id, revokeSelfSessionMutation.mutate]);

  return (
    <IconButton onClick={handleClick} aria-label="revoke session">
      <MdDelete />
    </IconButton>
  );
}
