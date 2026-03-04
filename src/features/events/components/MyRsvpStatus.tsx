import { eventQueryOptions } from "@/queries/events.queries";
import { Route } from "@/routes/_authenticated/events.$eventId/rsvps/route";
import {
  RSVPStatusSchema,
  RSVPStatusUpdateSchema,
} from "@/server/schema/RSVPStatusSchema";
import { MenuItem, TextField } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import useUpdateRsvp from "../hooks/useUpdateRsvp";

export default function MyRsvpStatus() {
  const { eventId } = Route.useParams();

  const myRsvpStatusQuery = useSuspenseQuery(
    eventQueryOptions.eventRsvp(eventId),
  );

  const updateRsvpMutation = useUpdateRsvp();

  const disabled = useMemo(
    () =>
      myRsvpStatusQuery.data?.status === "ATTENDED" ||
      updateRsvpMutation.isPending,
    [myRsvpStatusQuery.data?.status, updateRsvpMutation.isPending],
  );

  return (
    <TextField
      select
      helperText="Select your RSVP status"
      fullWidth
      value={myRsvpStatusQuery.data?.status ?? ""}
      disabled={disabled}
      onChange={(e) => {
        // check to see if the value is submittable
        const data = RSVPStatusUpdateSchema.safeParse(e.target.value);

        if (data.success) {
          updateRsvpMutation.mutate({
            data: {
              eventId,
              status: data.data,
            },
          });
        }
      }}
    >
      <MenuItem value="" disabled>
        Select RSVP Status
      </MenuItem>
      <MenuItem value={RSVPStatusSchema.enum.MAYBE}>Maybe</MenuItem>
      <MenuItem value={RSVPStatusSchema.enum.NO}>No</MenuItem>
      <MenuItem value={RSVPStatusSchema.enum.YES}>Yes</MenuItem>
      <MenuItem value={RSVPStatusSchema.enum.LATE}>Late</MenuItem>
      <MenuItem value={RSVPStatusSchema.enum.ATTENDED} disabled>
        Attended
      </MenuItem>
    </TextField>
    // <ControlledSelect
    //   control={control}
    //   name="status"
    //   label="RSVP Status"
    //   disabled={disabled}
    //   options={[
    //     {
    //       value: "",
    //       label: "Select RSVP Status",
    //       disabled: true,
    //     },
    //     {
    //       value: "LATE",
    //       label: "Late",
    //     },
    //     { value: "MAYBE", label: "Maybe" },
    //     { value: "NO", label: "No" },
    //     { value: "YES", label: "Yes", divider: true },
    //     { value: "ATTENDED", label: "Attended", disabled: true },
    //   ]}
    //   helperText="Select your RSVP status"
    // />
  );
}
