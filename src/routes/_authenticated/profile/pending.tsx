import PendingEventListItem from "@/components/PendingEventListItem";
import { usersQueryOptions } from "@/queries/users.queries";
import { createFileRoute } from "@tanstack/react-router";

import { Container, List, Paper, Stack, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/profile/pending")({
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userSelfPendingRsvps());
  },
  head: () => ({
    meta: [
      {
        title: "Profile - Pending Events",
      },
    ],
  }),
  component: Component,
  wrapInSuspense: true,
});

function Component() {
  const pendingEventsQuery = useSuspenseQuery(
    usersQueryOptions.userSelfPendingRsvps(),
  );

  return (
    <Container sx={{ my: 2, flex: 1, overflowY: "auto" }}>
      <Stack
        sx={{
          py: 2,
          gap: 2,
        }}
      >
        <Paper sx={{ p: 2 }}>
          <Stack
            sx={{
              gap: 2,
            }}
          >
            <Typography variant="h4">Active Events</Typography>
            <Typography variant="body1">
              Events that you checked into but have not yet checked out of.
            </Typography>
            <List>
              {pendingEventsQuery.data.map((rsvp) => (
                <PendingEventListItem
                  rsvp={rsvp}
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
