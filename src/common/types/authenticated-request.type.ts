import type { Request as ExpressRequest } from 'express';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user.type';

export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthenticatedUser;
}
