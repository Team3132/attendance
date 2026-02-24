import { createStart } from "@tanstack/react-start";
import {
  authBaseMiddleware,
  bearerInjectionMiddleware,
} from "./middleware/authMiddleware";
import {
  functionLoggerMiddleware,
  requestLoggerMiddleware,
} from "./middleware/loggerMiddleware";
import { customFetchMiddleware } from "./middleware/tauriFetchMiddleware";

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [
      functionLoggerMiddleware,
      bearerInjectionMiddleware,
      customFetchMiddleware,
    ],
    requestMiddleware: [requestLoggerMiddleware, authBaseMiddleware],
  };
});
