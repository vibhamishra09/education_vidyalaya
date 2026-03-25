import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: 'clerkId' | 'dbUserId' | 'auth' | string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!data) {
      return request.userId;
    }

    if (data === 'clerkId') {
      return request.clerkUserId ?? request.userId;
    }

    if (data === 'dbUserId') {
      return request.dbUserId;
    }

    if (data === 'auth') {
      return request.auth;
    }

    return request[data];
  },
);
