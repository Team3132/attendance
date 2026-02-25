import useLogout from "@/hooks/useLogout";
import { authQueryOptions } from "@/queries/auth.queries";
import env from "@/server/env";
import { authQueryKeys } from "@/server/queryKeys";
import { Button, Container, Paper, Stack, Typography } from "@mui/material";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Suspense } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      {
        title: "Login",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(authQueryOptions.status());
  },
  component: Component,
});

function Component() {
  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignContent: "center",
        justifyContent: "center",
        height: "100%",
        overflow: "auto",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 2,
          justifySelf: "center",
        }}
      >
        <Stack gap={2}>
          <Typography variant="h4" textAlign={"center"}>
            Login
          </Typography>
          <Typography variant="body1" textAlign={"center"}>
            In order to use the attendance system, you must login with the same
            discord account that you use for the team Discord server.
          </Typography>
          <Stack gap={2} direction="row" justifyContent="center">
            <Suspense fallback={null}>
              {window?.isTauri ? <TauriLoginButton /> : <LoginButton />}
              {/* <LoginButton /> */}
            </Suspense>
            <Suspense fallback={null}>
              <LogoutButton />
            </Suspense>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
}

function LogoutButton() {
  const authStatusQuery = useSuspenseQuery(authQueryOptions.status());

  const logoutMutation = useLogout();

  if (authStatusQuery.data.isAuthenticated) {
    return (
      <Button
        variant="contained"
        color="secondary"
        onClick={() => logoutMutation.mutate()}
        loading={logoutMutation.isPending}
      >
        Logout
      </Button>
    );
  }

  return <></>;
}

function LoginButton() {
  return (
    <Button variant="contained" color="primary" href="/api/auth/discord">
      Login
    </Button>
  );
}

function TauriLoginButton() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const handleLoginMutation = useMutation({
    mutationKey: ["tauri", "login"],
    mutationFn: async () => {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
      await openUrl(`${env.VITE_URL}/api/auth/discord?isTauri=1`);

      let unlistener = () => {};

      const urls = await new Promise<string[]>((res, rej) => {
        onOpenUrl((urls) => {
          res(urls);
        })
          .then((res) => {
            unlistener = res;
          })
          .catch(rej);
      });

      unlistener();

      const [url] = urls;

      const tokenSearchParam = new URL(url).searchParams.get("token");
      const { load } = await import("@tauri-apps/plugin-store");
      const authStore = await load("auth.json");
      if (tokenSearchParam) await authStore.set("token", tokenSearchParam);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: authQueryKeys.status(),
      });
      navigate({
        to: "/",
        reloadDocument: true,
      });
    },
  });

  return (
    <Button
      variant="contained"
      color="primary"
      // href="/api/auth/discord?isTauri=1"
      onClick={() => handleLoginMutation.mutate()}
      loading={handleLoginMutation.isPending}
    >
      Login
    </Button>
  );
}
