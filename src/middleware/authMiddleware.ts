import type { ServerContext } from "@/server";
import {
  type SessionValidationResult,
  getCurrentSession,
} from "@/server/auth/session";
import env from "@/server/env";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

declare global {
  // Note the capital "W"
  interface Window {
    isTauri?: boolean;
  }
}

export const bearerInjectionMiddleware = createMiddleware({
  type: "function",
}).client(async ({ next }) => {
  if (window?.isTauri) {
    const { load } = await import("@tauri-apps/plugin-store");
    const authStore = await load("auth.json");
    const token = await authStore.get<string>("token");

    if (token) {
      console.log("injected token", token);

      return next({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next();
});

/**
 * Middleware to check if the user is authenticated and has a valid session
 * If the user is not authenticated, a blank session is created
 * If the user is authenticated, the session is validated and updated if required
 * If there's any errors then session and user are set to null
 */
export const authBaseMiddleware = createMiddleware().server(
  async ({ next, context: c }) => {
    const result = await getCurrentSession(c as unknown as ServerContext);

    return next({
      context: result as ServerContext & SessionValidationResult,
    });
  },
);

/**
 * Middleware to check if the user is authenticated and has a valid session
 */
export const sessionMiddleware = createMiddleware()
  .middleware([authBaseMiddleware])
  .server(async ({ context, next }) => {
    const { session, user } = context;

    // If there's no session or user, we're not logged in and we should redirect to the login page
    if (!session || !user) {
      throw redirect({
        to: "/login",
      });
    }

    return next({
      context: {
        session,
        user,
      },
    });
  });

/**
 * Middleware to check the role of the user
 */
export const adminMiddleware = createMiddleware()
  .middleware([sessionMiddleware])
  .server(async ({ context, next }) => {
    const { user } = context;

    if (!env.ADMIN_ROLE_ID || !user?.roles?.includes(env.ADMIN_ROLE_ID)) {
      throw redirect({
        to: "/login",
      });
    }

    return next({
      context,
    });
  });
