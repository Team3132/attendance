import NewAdminScancodeListItem from "@/features/user/components/NewAdminScancodeForm";
import { usersQueryOptions } from "@/queries/users.queries";
import { createFileRoute } from "@tanstack/react-router";

import AdminScancodeList from "@/features/user/components/AdminScancodeList";
import { Container, Paper, Stack, Typography } from "@mui/material";

export const Route = createFileRoute("/_authenticated/admin_/users/$userId/")({
  component: Component,
  loader: ({ context: { queryClient }, params: { userId } }) => {
    queryClient.prefetchQuery(usersQueryOptions.userScancodes(userId));
    return queryClient.ensureQueryData(usersQueryOptions.userDetails(userId));
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.username}'s Scancodes`,
      },
    ],
  }),
  wrapInSuspense: true,
});

function Component() {
  const { userId } = Route.useParams();

  return (
    <Container sx={{ my: 2, flex: 1, overflowY: "auto" }}>
      <Stack py={2} gap={2}>
        <Paper sx={{ p: 2 }}>
          <Stack gap={2}>
            <Typography variant="h4">Scancodes</Typography>
            <Typography variant="body1">
              Scancodes are used to check in to events. You can generate a new
              scancode at any time.
            </Typography>
            <NewAdminScancodeListItem userId={userId} />
            <AdminScancodeList userId={userId} />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
