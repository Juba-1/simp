import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export const RequestMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMeta => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : request.ip;

    return {
      ipAddress: ip,
      userAgent: request.headers['user-agent'],
    };
  },
);
