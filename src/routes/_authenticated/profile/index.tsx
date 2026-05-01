import NewScancodeListItem from "@/features/user/components/NewScancodeForm";
import { usersQueryOptions } from "@/queries/users.queries";
import { createFileRoute } from "@tanstack/react-router";

import ScancodeList from "@/features/user/components/ScancodeList";
import { Container, Paper, Stack, Typography } from "@mui/material";

export const Route = createFileRoute("/_authenticated/profile/")({
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userSelfScancodes());
  },
  head: () => ({
    meta: [
      {
        title: "Profile",
      },
    ],
  }),
  component: Component,
  wrapInSuspense: true,
});

function Component() {
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
              py: 2,
              gap: 2,
            }}
          >
            <Typography variant="h4">Scancodes</Typography>
            <Typography variant="body1">
              Scancodes are used to check in to events. You can generate a new
              scancode at any time.
            </Typography>
            <NewScancodeListItem />
            <ScancodeList />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
