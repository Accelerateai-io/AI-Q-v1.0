import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: string | (JwtPayload & { email?: string; userId?: string });
      /** User row from DB, set by onboarding middleware after lookup by token email */
      onboardingUser?: {
        id: number;
        email: string;
        organization_id: number;
        organization_name?: string;
        user_onboarding_completed: string | null;
        [key: string]: unknown;
      };
    }
  }
}

export {};
