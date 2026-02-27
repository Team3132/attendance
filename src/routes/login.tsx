import useLogout from "@/hooks/useLogout";
import { authQueryOptions } from "@/queries/auth.queries";
import env from "@/server/env";
import { isTauri } from "@/utils/isTauri";
import { Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { UnlistenFn } from "@tauri-apps/api/event";

import { Suspense, useCallback, useEffect, useRef } from "react";

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
              {isTauri ? <TauriLoginButton /> : <LoginButton />}
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
  const onOpenUrlListener = useRef<UnlistenFn | null>(null);

  const handleDeepLink = useCallback(
    async (urls: string[]) => {
      const [url] = urls;

      if (!url) return;

      const tokenSearchParam = new URL(url).searchParams.get("token");
      const { load } = await import("@tauri-apps/plugin-store");
      const authStore = await load("auth.json");
      if (!tokenSearchParam) return;

      await authStore.set("token", tokenSearchParam);

      // client.clear();
      navigate({
        to: "/",
        reloadDocument: true,
      });
    },
    [navigate],
  );

  useEffect(() => {
    if (!isTauri) return;
    try {
      (async () => {
        const { onOpenUrl } = await import("@tauri-apps/plugin-deep-link");
        const unlisten = await onOpenUrl(async (urls) => {
          if (urls.length === 0) return;
          await handleDeepLink(urls);
        });

        console.log("registered deep link listener");

        onOpenUrlListener.current = unlisten;
      })();
    } catch (error) {
      console.error(error);
    }

    return () => {
      if (onOpenUrlListener.current) {
        console.log("unregistered deep link listener");
        onOpenUrlListener.current();
      }
    };
  }, [handleDeepLink]);

  const handleLoginMutation = useMutation({
    mutationKey: ["tauri", "login"],
    mutationFn: async () => {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(`${env.VITE_URL}/api/auth/discord?isTauri=1`);
    },
    onSuccess: () => {},
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
