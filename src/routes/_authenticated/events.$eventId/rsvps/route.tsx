import { LinkButton } from "@/components/LinkButton";
import AdminRSVPListItem from "@/features/events/components/AdminRsvpListItem";
import MyRsvpStatus from "@/features/events/components/MyRsvpStatus";
import RSVPListItem from "@/features/events/components/RSVPListItem";
import useRSVPListInvalidator from "@/hooks/useRSVPListInvalidator";
import { authQueryOptions } from "@/queries/auth.queries";
import { eventQueryOptions } from "@/queries/events.queries";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/_authenticated/events/$eventId/rsvps")({
  loader: ({ context: { queryClient }, params: { eventId } }) => {
    queryClient.prefetchQuery(eventQueryOptions.eventRsvps(eventId));
    queryClient.prefetchQuery(eventQueryOptions.eventRsvp(eventId));
  },
  head: () => ({
    meta: [
      {
        title: "Event - RSVPs",
      },
    ],
  }),
  component: Component,
  wrapInSuspense: true,
});

function Component() {
  return (
    <Paper
      sx={{
        p: 2,
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h5">RSVPs</Typography>
        <Suspense fallback={<SkeletonTextInput />}>
          <MyRsvpStatus />
        </Suspense>
        <Suspense fallback={<SkeletonRSVPList />}>
          <RSVPList />
        </Suspense>
        <Suspense fallback={null}>
          <RSVPAddButton />
          <Outlet />
        </Suspense>
      </Stack>
    </Paper>
  );
}

function SkeletonTextInput() {
  return <Skeleton width={100} />;
}

function RSVPSkeletonItem() {
  return (
    <ListItem>
      <ListItemAvatar>
        <Skeleton variant="circular" width={40} height={40} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton width={100} />}
        secondary={<Skeleton width={50} />}
      />
    </ListItem>
  );
}

function SkeletonRSVPList() {
  return (
    <List>
      <RSVPSkeletonItem />
      <RSVPSkeletonItem />
      <RSVPSkeletonItem />
    </List>
  );
}

function RSVPList() {
  const { eventId } = Route.useParams();

  const authStatusQuery = useSuspenseQuery(authQueryOptions.status());
  const rsvpsQuery = useSuspenseQuery(eventQueryOptions.eventRsvps(eventId));
  useRSVPListInvalidator(eventId);

  if (authStatusQuery.data.isAdmin) {
    return (
      <List>
        {rsvpsQuery.data.map((rsvp) => (
          <AdminRSVPListItem
            rsvp={rsvp}
            key={`${rsvp.eventId}-${rsvp.userId}`}
          />
        ))}
      </List>
    );
  }

  return (
    <List>
      {rsvpsQuery.data.map((rsvp) => (
        <RSVPListItem rsvp={rsvp} key={`${rsvp.eventId}-${rsvp.userId}`} />
      ))}
    </List>
  );
}

function RSVPAddButton() {
  const authStatusQuery = useSuspenseQuery(authQueryOptions.status());

  if (!authStatusQuery.data.isAdmin) {
    return <></>;
  }

  return (
    <LinkButton
      from="/events/$eventId"
      to="rsvps/new"
      mask={{
        to: "/events/$eventId/rsvps",
      }}
      variant="contained"
    >
      Create or Edit RSVP
    </LinkButton>
  );
}
