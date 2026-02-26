import type { ServerContext } from "@/server";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding";
import { createServerOnlyFn } from "@tanstack/react-start";
import {
  getCookie,
  getRequestHeader,
  setCookie,
} from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { type Session, type User, sessionTable } from "../drizzle/schema";

const validateSessionToken = createServerOnlyFn(
  async (c: ServerContext, token: string): Promise<SessionValidationResult> => {
    const { db } = c;

    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );

    const session = await db.query.sessionTable.findFirst({
      where: (table) => eq(table.id, sessionId),
      with: {
        user: true,
      },
    });

    if (session === undefined) {
      return { session: null, user: null };
    }

    const { user } = session;
    if (Date.now() >= session.expiresAt.getTime()) {
      await db.delete(sessionTable).where(eq(sessionTable.id, session.id));

      return { session: null, user: null };
    }
    if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
      session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

      await db
        .update(sessionTable)
        .set({
          expiresAt: session.expiresAt,
        })
        .where(eq(sessionTable.id, session.id));
    }
    return { session, user };
  },
);

export const getCurrentSession = createServerOnlyFn(
  async (c: ServerContext): Promise<SessionValidationResult> => {
    const token = getCookie("session");
    const authorizationHeader = getRequestHeader("Authorization");

    if (token) {
      const result = await validateSessionToken(c, token);

      return result;
    }

    if (authorizationHeader?.startsWith("Bearer")) {
      const token = authorizationHeader.slice("Bearer ".length - 1).trim();

      const result = await validateSessionToken(c, token);

      return result;
    }

    return { session: null, user: null };
  },
);

export const invalidateSession = createServerOnlyFn(
  async (c: ServerContext, sessionId: string) => {
    const { db } = c;

    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  },
);

export const invalidateUserSessions = createServerOnlyFn(
  async (c: ServerContext, userId: string) => {
    const { db } = c;
    await db.delete(sessionTable).where(eq(sessionTable.userId, userId));
  },
);

export const invalidateUserSession = createServerOnlyFn(
  async (c: ServerContext, userId: string, sessionId: string) => {
    const { db } = c;
    await db
      .delete(sessionTable)
      .where(
        and(eq(sessionTable.userId, userId), eq(sessionTable.id, sessionId)),
      );
  },
);

export const setSessionTokenCookie = createServerOnlyFn(
  (token: string, expiresAt: Date) => {
    setCookie("session", token, {
      httpOnly: true,
      path: "/",
      secure: import.meta.env.PROD,
      sameSite: "lax",
      expires: expiresAt,
    });
  },
);

export const deleteSessionTokenCookie = createServerOnlyFn(() => {
  setCookie("session", "", {
    httpOnly: true,
    path: "/",
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 0,
  });
});

export const generateSessionToken = createServerOnlyFn((): string => {
  const tokenBytes = new Uint8Array(20);
  crypto.getRandomValues(tokenBytes);
  const token = encodeBase32(tokenBytes).toLowerCase();
  return token;
});

export const createSession = createServerOnlyFn(
  async (c: ServerContext, token: string, userId: string): Promise<Session> => {
    const { db } = c;

    const sessionId = encodeHexLowerCase(
      sha256(new TextEncoder().encode(token)),
    );

    const session: Session = {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    await db.insert(sessionTable).values(session);

    return session;
  },
);

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };
