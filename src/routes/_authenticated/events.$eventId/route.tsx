import GenericServerErrorBoundary from "@/components/GenericServerErrorBoundary";
import { LinkChip } from "@/components/LinkChip";
import LinkTabs from "@/components/LinkTabs";
import type { TabItem } from "@/hooks/useTabIndex";
import { authQueryOptions } from "@/queries/auth.queries";
import { eventQueryOptions } from "@/queries/events.queries";
import { getLocale } from "@/utils/dt";
import { Skeleton, Stack, Typography, styled } from "@mui/material";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { DateTime } from "luxon";
import { Suspense, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/events/$eventId")({
  loader: ({ context: { queryClient }, params: { eventId } }) => {
    queryClient.prefetchQuery(authQueryOptions.status());

    queryClient.prefetchQuery(eventQueryOptions.eventDetails(eventId));
  },
  head: () => ({
    meta: [
      {
        title: "Event - RSVPs",
      },
    ],
  }),
  component: Component,
});

const userTabs = (eventId: string): TabItem[] => [
  {
    label: "RSVPs",
    to: "/events/$eventId/rsvps",
    params: {
      eventId: eventId,
    },
  },
  {
    label: "Check-In",
    to: "/events/$eventId/check-in",
  },
];

const adminTabs = (eventId: string): TabItem[] =>
  userTabs(eventId).concat([
    {
      label: "Code",
      to: "/events/$eventId/qr-code",
    },
  ]);

function Component() {
  const { eventId } = Route.useParams();

  const defaultTabs = useMemo(() => userTabs(eventId), [eventId]);

  return (
    <GenericServerErrorBoundary>
      <Suspense fallback={<EventTitleSkeleton />}>
        <EventTitle />
      </Suspense>
      <Suspense
        fallback={<LinkTabs scrollButtons="auto" tabs={defaultTabs} centered />}
      >
        <ProfileTabs />
      </Suspense>
      <Outlet />
    </GenericServerErrorBoundary>
  );
}

function ProfileTabs() {
  const { eventId } = Route.useParams();

  const authStatusQuery = useSuspenseQuery(authQueryOptions.status());

  const tabs = useMemo<Array<TabItem>>(
    () =>
      authStatusQuery.data.isAdmin ? adminTabs(eventId) : userTabs(eventId),

    [eventId, authStatusQuery.data.isAdmin],
  );

  return <LinkTabs scrollButtons="auto" tabs={tabs} centered />;
}

const generateCheckinCheckout = (startTime: Date, endTime: Date) => {
  const checkin = DateTime.fromJSDate(startTime);
  const checkout = DateTime.fromJSDate(endTime);

  if (!checkin.isValid || !checkout.isValid) return "Missing Dates";

  const isSameDay =
    checkin && checkout ? checkin.hasSame(checkout, "day") : false;

  const hours = checkout.diff(checkin, "hours").toHuman();

  if (isSameDay) {
    // If the checkin and checkout are on the same day, show the time range
    return `${checkin.toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY, {
      locale: getLocale(),
    })} - ${checkout.toLocaleString(DateTime.TIME_SIMPLE, { locale: getLocale() })} (${hours})`;
  }

  // If the checkin and checkout are not on the same day, show the date range
  return `${checkin.toLocaleString(DateTime.DATETIME_MED, {
    locale: getLocale(),
  })} - ${checkout.toLocaleString(DateTime.DATETIME_MED, { locale: getLocale() })} (${hours})`;
};

const CenteredStack = styled(Stack)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(2),
}));

function EventTitle() {
  const { eventId } = Route.useParams();
  const eventData = useSuspenseQuery(eventQueryOptions.eventDetails(eventId));

  const dateText = useMemo(
    () =>
      generateCheckinCheckout(eventData.data.startDate, eventData.data.endDate),
    [eventData.data.endDate, eventData.data.startDate],
  );

  return (
    <CenteredStack>
      <Typography variant="h4">{eventData.data.title}</Typography>

      <Typography variant="subtitle1">{dateText}</Typography>
      {eventData.data.rule ? (
        <LinkChip
          to="/admin/event-parsing/$ruleId"
          color="primary"
          params={{
            ruleId: eventData.data.rule.id,
          }}
          label={eventData.data.rule.name}
          sx={{
            alignSelf: "center",
          }}
        />
      ) : null}
    </CenteredStack>
  );
}

function EventTitleSkeleton() {
  return (
    <CenteredStack>
      <Typography variant="h4">
        <CenteredSkeleton width={300} />
      </Typography>
      <Typography variant="subtitle1">
        <CenteredSkeleton width={230} />
      </Typography>
    </CenteredStack>
  );
}

const CenteredSkeleton = styled(Skeleton)(() => ({
  margin: "0 auto",
}));
