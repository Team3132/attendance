import {
  adminMiddleware,
  authBaseMiddleware,
  sessionMiddleware,
} from "@/middleware/authMiddleware";
import {
  invalidateUserSession,
  invalidateUserSessions,
} from "@/server/auth/session";
import env from "@/server/env";
import { authQueryKeys, usersQueryKeys } from "@/server/queryKeys";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";

const authStatusFn = createServerFn({ method: "GET" })
  .middleware([authBaseMiddleware])
  .handler(async ({ context }) => {
    return {
      isAuthenticated: !!context.user,
      isAdmin:
        env.ADMIN_ROLE_ID && context.user?.roles?.includes(env.ADMIN_ROLE_ID),
    };
  });

const revokeSelfSession = createServerFn({
  method: "POST",
})
  .middleware([sessionMiddleware])
  .inputValidator(z.string())
  .handler(({ context, data }) => {
    return invalidateUserSession(context, context.user.id, data);
  });

const revokeSelfSessions = createServerFn({
  method: "POST",
})
  .middleware([sessionMiddleware])
  .handler(({ context }) => {
    return invalidateUserSessions(context, context.user.id);
  });

const revokeUserSessions = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(z.string())
  .handler(({ context, data }) => {
    return invalidateUserSessions(context, data);
  });

const revokeUserSession = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      userId: z.string(),
      sessionId: z.string(),
    }),
  )
  .handler(({ context, data }) => {
    return invalidateUserSession(context, data.userId, data.sessionId);
  });

export const authQueryOptions = {
  status: () =>
    queryOptions({
      queryKey: authQueryKeys.status(),
      queryFn: ({ signal }) => authStatusFn({ signal }),
    }),
};

export const authMutationOptions = {
  revokeSelfSession: mutationOptions({
    mutationFn: revokeSelfSession,
    meta: {
      invalidates: [usersQueryKeys.userSelfSessions()],
    },
  }),
  revokeSelfSessions: mutationOptions({
    mutationFn: revokeSelfSessions,
    onSuccess: (_data, _vars, _onMutateResult, { client }) => {
      client.clear();
    },
    meta: {
      invalidates: [usersQueryKeys.userSelfSessions()],
    },
  }),
  revokeUserSessions: mutationOptions({
    mutationFn: revokeUserSessions,
    onSuccess: (_data, { data }, _onMutateResult, { client }) => {
      client.invalidateQueries({
        queryKey: [usersQueryKeys.userSessions(data)],
      });
    },
  }),
  revokeUserSession: mutationOptions({
    mutationFn: revokeUserSession,
    onSuccess: (_data, { data: { userId } }, _onMutateResult, { client }) => {
      client.invalidateQueries({
        queryKey: [usersQueryKeys.userSessions(userId)],
      });
    },
  }),
};
