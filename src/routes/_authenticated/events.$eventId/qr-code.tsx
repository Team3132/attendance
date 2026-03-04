import ScaninCard from "@/features/events/components/ScaninCard";
import { authQueryOptions } from "@/queries/auth.queries";
import { eventQueryOptions } from "@/queries/events.queries";
import {
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";
import { FaCopy } from "react-icons/fa6";
import { useCopyToClipboard } from "usehooks-ts";

export const Route = createFileRoute("/_authenticated/events/$eventId/qr-code")(
  {
    beforeLoad: async ({ context: { queryClient } }) => {
      const { isAdmin } = await queryClient.ensureQueryData(
        authQueryOptions.status(),
      );

      if (!isAdmin) {
        throw redirect({
          to: "/error",
          search: {
            message: "You are not an admin",
          },
        });
      }
    },
    loader: ({ context: { queryClient }, params: { eventId } }) => {
      queryClient.prefetchQuery(eventQueryOptions.eventSecret(eventId));
    },
    head: () => ({
      meta: [
        {
          title: "Event - Code",
        },
      ],
    }),
    component: Component,
    wrapInSuspense: true,
  },
);

function Component() {
  const { eventId } = Route.useParams();

  return (
    <Stack gap={2}>
      <Paper
        sx={{
          p: 2,
        }}
      >
        <Suspense
          fallback={
            <TextField
              label="Event Code"
              disabled
              value={"Loading..."}
              fullWidth
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton disabled>
                        <FaCopy />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          }
        >
          <EventSecretTextBox />
        </Suspense>
      </Paper>
      <ScaninCard eventId={eventId} />
    </Stack>
  );
}

function EventSecretTextBox() {
  const { eventId } = Route.useParams();

  const eventSecretQuery = useSuspenseQuery(
    eventQueryOptions.eventSecret(eventId),
  );

  return (
    <TextField
      slotProps={{
        input: {
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <EventSecretIconButton />
            </InputAdornment>
          ),
        },
      }}
      fullWidth
      value={eventSecretQuery.data.secret}
      label="Event Code"
    />
  );
}

function EventSecretIconButton() {
  const [, copyFn] = useCopyToClipboard();
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();

  const handleCopy = useCallback(async () => {
    const eventSecret = await queryClient.ensureQueryData(
      eventQueryOptions.eventSecret(eventId),
    );

    await copyFn(eventSecret.secret);
  }, [copyFn, queryClient, eventId]);

  return (
    <IconButton onClick={handleCopy}>
      <FaCopy />
    </IconButton>
  );
}
