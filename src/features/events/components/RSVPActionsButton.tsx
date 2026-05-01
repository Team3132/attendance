import { useDisclosure } from "@/hooks/useDisclosure";
import { eventQueryOptions } from "@/queries/events.queries";
import { logger } from "@/utils/logger";
import { trytm } from "@/utils/trytm";
import { Divider, IconButton, Menu, MenuItem } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useId, useRef } from "react";
import { MdEdit } from "react-icons/md";
import useAddUserRsvp from "../hooks/useAddRsvp";

interface RSVPActionsButtonProps {
  eventId: string;
  userId: string;
}

export default function RSVPActionsButton(props: RSVPActionsButtonProps) {
  const { eventId, userId } = props;

  const { getButtonProps, getDisclosureProps, isOpen, onClose } =
    useDisclosure();

  const queryClient = useQueryClient();

  const addUserEventRsvpMutation = useAddUserRsvp();

  const menuId = useId();
  const anchorEl = useRef(null);

  /**
   * Set the user's check-in time to the current time.
   */
  const checkinUserNow = useCallback(async () => {
    await addUserEventRsvpMutation.mutateAsync({
      data: {
        eventId: eventId,
        userId: userId,
        checkinTime: new Date(),
      },
    });

    // Close the menu
    onClose();
  }, [addUserEventRsvpMutation, eventId, userId, onClose]);

  /**
   * Set the user's checkout time to the current time.
   */
  const checkoutUserNow = useCallback(async () => {
    const [rsvpDetails, detailsError] = await trytm(
      queryClient.ensureQueryData(eventQueryOptions.userRsvp(eventId, userId)),
    );

    if (detailsError) {
      logger.error(detailsError);
      return;
    }

    const [eventDetails, eventDetailsError] = await trytm(
      queryClient.ensureQueryData(eventQueryOptions.eventDetails(eventId)),
    );

    if (eventDetailsError) {
      logger.error(eventDetailsError);
      return;
    }

    const checkinTime = rsvpDetails?.checkinTime
      ? rsvpDetails.checkinTime
      : eventDetails.startDate;

    await addUserEventRsvpMutation.mutateAsync({
      data: {
        eventId: eventId,
        userId: userId,
        checkinTime: checkinTime,
        checkoutTime: new Date(),
      },
    });

    // Close the menu
    onClose();
  }, [addUserEventRsvpMutation, eventId, userId, onClose, queryClient]);

  /**
   * Set the user's empty check-in and checkout times to the event's start and/or end time.
   */
  const rsvpEventTime = useCallback(async () => {
    const eventDetailsQuery = await queryClient.ensureQueryData(
      eventQueryOptions.eventDetails(eventId),
    );

    await addUserEventRsvpMutation.mutateAsync({
      data: {
        eventId: eventId,
        userId: userId,
        checkinTime: eventDetailsQuery.startDate,
        checkoutTime: eventDetailsQuery.endDate,
      },
    });

    // Close the menu
    onClose();
  }, [addUserEventRsvpMutation, queryClient, eventId, userId, onClose]);

  /**
   * Clear the user's check-in and checkout times.
   * (Assume "RSVP'd" status)
   */
  const clearCheckinCheckout = useCallback(async () => {
    await addUserEventRsvpMutation.mutateAsync({
      data: {
        eventId: eventId,
        userId: userId,
        checkinTime: null,
        checkoutTime: null,
        status: "YES",
      },
    });

    // Close the menu
    onClose();
  }, [addUserEventRsvpMutation, eventId, userId, onClose]);

  return (
    <>
      <IconButton
        disabled={addUserEventRsvpMutation.isPending}
        id={`${menuId}-button`}
        aria-controls={isOpen ? `${menuId}-menu` : undefined}
        aria-haspopup="true"
        aria-expanded={isOpen ? "true" : undefined}
        {...getButtonProps()}
        ref={anchorEl}
      >
        <MdEdit />
      </IconButton>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl.current}
        {...getDisclosureProps()}
        slotProps={{
          list: {
            "aria-labelledby": `${menuId}-button`,
          },
        }}
      >
        <MenuItem onClick={checkinUserNow}>Check-in now</MenuItem>
        <MenuItem onClick={checkoutUserNow}>Checkout now</MenuItem>
        <MenuItem onClick={rsvpEventTime}>RSVP event time</MenuItem>
        <MenuItem onClick={clearCheckinCheckout}>
          Clear check-in/checkout
        </MenuItem>
        <Divider />
        <MenuItem onClick={onClose}>Close</MenuItem>
      </Menu>
    </>
  );
}
