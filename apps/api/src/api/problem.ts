import type { Response } from 'express';

export function problem(
  response: Response,
  status: number,
  type: string,
  title: string,
  detail: string,
): void {
  response
    .status(status)
    .type('application/problem+json')
    .json({
      type: `urn:jackys-service-portal:errors:${type}`,
      title,
      status,
      detail,
    });
}
