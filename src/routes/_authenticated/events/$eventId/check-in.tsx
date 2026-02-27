import ControlledTextField from "@/components/ControlledTextField";
import ScanAdornment from "@/components/ScanAdornment";
import useSelfCheckin from "@/features/events/hooks/useSelfCheckin";
import { SelfCheckinSchema } from "@/server/schema/SelfCheckinSchema";
import { logger } from "@/utils/logger";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Paper, Stack, Typography } from "@mui/material";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { useForm } from "react-hook-form";

export const Route = createFileRoute(
  "/_authenticated/events/$eventId/check-in",
)({
  head: () => ({
    meta: [
      {
        title: "Event - Check-In",
      },
    ],
  }),
  component: Component,
  wrapInSuspense: true,
});

function Component() {
  const { eventId } = Route.useParams();
  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
    setValue,
  } = useForm({
    resolver: zodResolver(SelfCheckinSchema),
    defaultValues: {
      secret: "",
      eventId,
    },
  });

  const checkinMutation = useSelfCheckin();

  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (data) => {
    try {
      await checkinMutation.mutateAsync({
        data: { secret: data.secret, eventId },
      });

      navigate({
        to: "/",
      });
    } catch (e) {
      if (e instanceof Error) {
        logger.error(e);
      }
    }
  });

  const handleScan = useCallback(
    (v: string) => {
      setValue("secret", v);
      onSubmit();
    },
    [onSubmit, setValue],
  );

  return (
    <Stack gap={2}>
      <Paper sx={{ p: 2 }} component={"form"} onSubmit={onSubmit}>
        <Stack gap={2}>
          <Typography variant="h4" textAlign={"center"}>
            Event Check In
          </Typography>
          <Typography variant="body1" textAlign={"center"}>
            Check in for the event using the code displayed at the event by
            entering it below. Or, use your phone's camera to scan the QR code.
          </Typography>
          <ControlledTextField
            label="Event Code"
            variant="outlined"
            fullWidth
            name="secret"
            control={control}
            rules={{ required: "This field is required" }}
            required
            slotProps={{
              input: {
                endAdornment: <ScanAdornment setSearch={handleScan} />,
              },
            }}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            loading={isSubmitting}
          >
            Check In
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
