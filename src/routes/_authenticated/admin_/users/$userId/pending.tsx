import PendingEventListItem from "@/components/AdminPendingEventListItem";
import { usersQueryOptions } from "@/queries/users.queries";
import { Container, List, Paper, Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/admin_/users/$userId/pending",
)({
  component: Component,
  loader: ({ context: { queryClient }, params: { userId } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userPendingRsvps(userId));
    return queryClient.ensureQueryData(usersQueryOptions.userDetails(userId));
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.username}'s Pending Events`,
      },
    ],
  }),
  wrapInSuspense: true,
});

function Component() {
  const { userId } = Route.useParams();

  const pendingEventsQuery = useSuspenseQuery(
    usersQueryOptions.userPendingRsvps(userId),
  );

  return (
    <Container sx={{ my: 2, flex: 1, overflowY: "auto" }}>
      <Stack sx={{ gap: 2, py: 2 }}>
        <Paper sx={{ p: 2 }}>
          <Stack sx={{ gap: 2 }}>
            <Typography variant="h4">Active Events</Typography>
            <Typography variant="body1">
              Events that you checked into but have not yet checked out of.
            </Typography>
            <List>
              {pendingEventsQuery.data.map((rsvp) => (
                <PendingEventListItem
                  rsvp={rsvp}
                  userId={userId}
                  key={`${rsvp.eventId}-${rsvp.userId}`}
                />
              ))}
            </List>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
