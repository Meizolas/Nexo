import type { Request } from 'express';

export function requestAuditContext(request: Request) {
  return {
    actorUserId: request.auth.userId,
    correlationId: String(request.id),
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}
