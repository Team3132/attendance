import { createFileRoute } from "@tanstack/react-router";

import ControlledAutocomplete from "@/components/ControlledAutocomplete";
import ControlledDateTime from "@/components/ControlledDateTime";
import ControlledSelect from "@/components/ControlledSelect";
import useAddUserRsvp from "@/features/events/hooks/useAddRsvp";
import { useDisclosure } from "@/hooks/useDisclosure";
import { eventQueryOptions } from "@/queries/events.queries";
import { usersQueryOptions } from "@/queries/users.queries";
import { RSVPStatusUpdateSchema } from "@/server/schema/RSVPStatusSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
} from "@mui/material";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import {
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
  useForm,
} from "react-hook-form";
import { useDebounceValue } from "usehooks-ts";
import { z } from "zod";

const searchSchema = z.object({
  userId: z.string().optional(),
});

export const Route = createFileRoute(
  "/_authenticated/events/$eventId/rsvps/new",
)({
  validateSearch: searchSchema,
  component: RouteComponent,
});

const UserOptionSchema = z.object({
  label: z.string().nonempty(),
  value: z.string().nonempty(),
});

const AddUserRsvpSchema = z.object({
  userOption: UserOptionSchema.nullable().default(null),
  checkinTime: z.date().nullable().optional(),
  checkoutTime: z.date().nullable().optional(),
  status: z.union([RSVPStatusUpdateSchema, z.literal("")]).default(""),
});

function RouteComponent() {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

  const {
    formState: { isSubmitting },
    handleSubmit,
    control,
    reset,
    setError,
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(AddUserRsvpSchema),
    defaultValues: {
      userOption: null,
      checkinTime: null,
      checkoutTime: null,
      status: "",
    },
  });

  const addUserEventRsvpMutation = useAddUserRsvp();

  const onClose = useCallback(() => {
    navigate({
      to: "/events/$eventId/rsvps",
    });
  }, [navigate]);

  const onSubmit = useCallback(
    () =>
      handleSubmit(async (data) => {
        try {
          const { userOption, status, ...rest } = data;
          const userOptionVal = userOption?.value;

          if (!userOptionVal) {
            setError("userOption", {
              message: "Please select a user",
            });
            return;
          }

          await addUserEventRsvpMutation.mutateAsync({
            data: {
              eventId,
              userId: userOptionVal,
              status: status === "" ? undefined : status,
              ...rest,
            },
          });
          reset();
          onClose();
        } catch (error) {
          if (error instanceof Error) {
            setError("userOption", {
              message: error.message,
            });
          } else {
            setError("userOption", {
              message: "An unknown error occurred",
            });
          }
        }
      }),
    [addUserEventRsvpMutation, eventId, onClose, reset, setError, handleSubmit],
  );

  /**
   * Handle the user selection
   * Restores existing values from the user's RSVP if it exists and it's not already set
   */
  const handleSelect = useCallback(
    async (
      data: {
        value: string;
      } | null,
    ) => {
      const eventRSVPs = await queryClient.ensureQueryData(
        eventQueryOptions.eventRsvps(eventId),
      );

      const selectedUserId = data?.value;

      const existingUserRsvp = eventRSVPs.find(
        (u) => u.userId === selectedUserId,
      );

      if (existingUserRsvp) {
        const existingValues = getValues();
        if (!existingValues.checkinTime && existingUserRsvp.checkinTime) {
          setValue("checkinTime", existingUserRsvp.checkinTime);
        }
        if (!existingValues.checkoutTime) {
          setValue("checkoutTime", existingUserRsvp.checkoutTime);
        }

        if (!existingValues.status && existingUserRsvp.status !== "ATTENDED") {
          setValue("status", existingUserRsvp.status ?? undefined);
        }
      }
    },
    [queryClient, getValues, setValue, eventId],
  );

  const endNowHandler = useCallback(async () => {
    if (!getValues().checkinTime) {
      const eventDetails = await queryClient.ensureQueryData(
        eventQueryOptions.eventDetails(eventId),
      );

      setValue("checkinTime", eventDetails.startDate);
    }
    setValue("checkoutTime", new Date());
  }, [eventId, getValues, queryClient, setValue]);

  const startNowHandler = useCallback(() => {
    setValue("checkinTime", new Date());
  }, [setValue]);

  const eventTimesHandler = useCallback(async () => {
    const eventDetails = await queryClient.ensureQueryData(
      eventQueryOptions.eventDetails(eventId),
    );

    setValue("checkinTime", eventDetails?.startDate);
    setValue("checkoutTime", eventDetails?.endDate);
  }, [eventId, queryClient, setValue]);

  const clearHandler = useCallback(() => {
    setValue("checkinTime", null);
    setValue("checkoutTime", null);
  }, [setValue]);

  return (
    <Dialog open onClose={onClose} component={"form"} onSubmit={onSubmit}>
      <DialogTitle>Add or Update an RSVP</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will create or update an RSVP for the event for the selected
          user.
        </DialogContentText>
        <Stack
          sx={{
            mt: 2,
            gap: 2,
          }}
        >
          <SearchingAutocomplete
            control={control}
            name="userOption"
            handleSelect={handleSelect}
          />
          <Stack
            direction="row"
            sx={{
              gap: 2,
            }}
          >
            <ControlledDateTime
              control={control}
              name="checkinTime"
              label="Checkin Time"
            />
            <ControlledDateTime
              control={control}
              name="checkoutTime"
              label="Checkout Time"
            />
          </Stack>

          {/* Time Presets */}
          <Stack
            direction="row"
            sx={{
              gap: 2,
              justifyContent: "space-evenly",
            }}
          >
            {/* Set start and end to event */}
            <Button onClick={eventTimesHandler}>Set to Event</Button>
            {/* Set start to now */}
            <Button onClick={startNowHandler}>Set Start to Now</Button>
            {/* Set end to now (start to event start if undef) */}
            <Button onClick={endNowHandler}>Set End to Now</Button>
            {/* Clear */}
            <Button onClick={clearHandler}>Clear</Button>
          </Stack>
          <ControlledSelect
            control={control}
            name="status"
            label="Status"
            placeholder="Select a status"
            helperText="Select the status of the RSVP"
            options={[
              { label: "", value: "" },
              { label: "No", value: "NO" },
              { label: "Maybe", value: "MAYBE" },
              { label: "Yes", value: "YES" },
              { label: "Late", value: "LATE" },
            ]}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type SearchingTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = UseControllerProps<TFieldValues, TName> & {
  handleSelect: (data: { value: string } | null) => void;
};

function SearchingAutocomplete<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: SearchingTextFieldProps<TFieldValues, TName>) {
  const { control, name, handleSelect } = props;

  const { getDisclosureProps, isOpen: isAutocompleteOpen } = useDisclosure();

  const [debouncedInputValue, setInputValue] = useDebounceValue("", 500);

  const usersQuery = useInfiniteQuery({
    ...usersQueryOptions.userList({
      search: debouncedInputValue,
      limit: 10,
    }),
    enabled: isAutocompleteOpen,
    placeholderData: keepPreviousData,
  });

  const userOption = useMemo(
    () =>
      usersQuery.data?.pages
        ?.flatMap((page) => page.items)
        .map((user) => ({
          label: user.username,
          value: user.id,
        })) ?? [],
    [usersQuery.data],
  );

  return (
    <ControlledAutocomplete
      control={control}
      name={name}
      label="User"
      placeholder="Select a user"
      helperText="Select the user to RSVP for"
      options={userOption}
      onInputChange={(_, value) => setInputValue(value)}
      loading={usersQuery.isFetching}
      required
      onChange={handleSelect}
      {...getDisclosureProps()}
    />
  );
}
