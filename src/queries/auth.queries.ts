import { authBaseMiddleware } from "@/middleware/authMiddleware";
import env from "@/server/env";
import { authQueryKeys } from "@/server/queryKeys";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

const authStatusFn = createServerFn({ method: "GET" })
  .middleware([authBaseMiddleware])
  .handler(async ({ context }) => {
    return {
      isAuthenticated: !!context.user,
      isAdmin:
        env.ADMIN_ROLE_ID && context.user?.roles?.includes(env.ADMIN_ROLE_ID),
    };
  });

export const authQueryOptions = {
  status: () =>
    queryOptions({
      queryKey: authQueryKeys.status(),
      queryFn: ({ signal }) => authStatusFn({ signal }),
    }),
};
