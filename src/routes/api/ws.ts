import type { ServerContext } from "@/server";
import type { SessionValidationResult } from "@/server/auth/session";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ws")({
  server: {
    handlers: {
      GET: ({ context, request }) => {
        const typedContext = context as unknown as ServerContext &
          SessionValidationResult;

        const success = typedContext.server?.upgrade(request, {
          data: typedContext,
        });
        if (!success) throw new Error("Failed to open websocket");

        return undefined;
      },
    },
  },
});
