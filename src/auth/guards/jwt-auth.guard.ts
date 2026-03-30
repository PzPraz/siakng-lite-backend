import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Silahkan login terlebih dahulu');
    }

    return user;
  }
}
