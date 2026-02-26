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

export const Route = createFileRoute(
  "/_authenticated/admin_/users/$userId/sessions",
)({
  loader: ({ context: { queryClient }, params: { userId } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userSessions(userId));
  },
  component: RouteComponent,
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
  const { userId } = Route.useParams();
  const sessions = useSuspenseQuery(usersQueryOptions.userSessions(userId));
  return (
    <List>
      {sessions.data.map((session) => (
        <ListItem
          key={session.id}
          secondaryAction={
            <RevokeSessionButton sessionId={session.id} userId={userId} />
          }
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
  sessionId: string;
  userId: string;
}

function RevokeSessionButton(props: RevokeSessionButtonProps) {
  const revokeSelfSessionMutation = useMutation(
    authMutationOptions.revokeUserSession,
  );

  const handleClick = useCallback(() => {
    revokeSelfSessionMutation.mutate({
      data: props,
    });
  }, [props, revokeSelfSessionMutation.mutate]);

  return (
    <IconButton onClick={handleClick} aria-label="revoke session">
      <MdDelete />
    </IconButton>
  );
}
