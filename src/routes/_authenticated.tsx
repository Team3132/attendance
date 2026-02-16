import BottomBar from "@/components/BottomBar";
import GenericServerErrorBoundary from "@/components/GenericServerErrorBoundary";
import TopBar from "@/components/TopBar";
import { authQueryOptions } from "@/queries/auth.queries";
import env from "@/server/env";
import { logger } from "@/utils/logger";
import { Box, Container } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import usePartySocket from "partysocket/react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const { isAuthenticated } = await queryClient.ensureQueryData(
      authQueryOptions.status(),
    );
    if (!isAuthenticated) {
      logger.warn("User is not authenticated, redirecting to login page.");
      throw redirect({
        to: "/login",
      });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(authQueryOptions.status());
  },
  component: Component,
});

const RootWrapper = styled(Box)({
  display: "flex",
  flexDirection: "column",
  height: "100%",
});

const RootContainer = styled(Container)({
  flex: 1,
  overflowY: "auto",
});

function Component() {
  usePartySocket({
    enabled: typeof Bun !== "undefined",
    host: new URL(env.VITE_URL).host,
    // usePartySocket takes the same arguments as PartySocket.

    basePath: "api/ws",

    // in addition, you can provide socket lifecycle event handlers
    // (equivalent to using ws.addEventListener in an effect hook)
    onOpen() {
      console.log("connected");
    },
    onMessage(e) {
      console.log("message", e.data);
    },
    onClose() {
      console.log("closed");
    },
    onError(_e) {
      console.log("error");
    },
  });

  return (
    <RootWrapper>
      <TopBar />
      <RootContainer id="main-area">
        {/* Catch any errors in authenticated routes */}
        <GenericServerErrorBoundary>
          <Outlet />
        </GenericServerErrorBoundary>
      </RootContainer>
      <BottomBar />
    </RootWrapper>
  );
}
