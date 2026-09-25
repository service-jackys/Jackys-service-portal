import type { Express, RequestHandler } from 'express';
import { createDbPool } from '../../../../packages/db/src/client.js';
import { ensureLocalAdminProfile } from '../../../../packages/db/src/profiles.js';
import { problem } from './problem.js';
import type { AuthUser, LocalAuth } from '../auth/local-auth.js';
import { createApplicationAuth } from '../auth/application-auth.js';
import { createComplaintHandlers } from '../complaints/routes.js';
import { createComplaintService } from '../complaints/service.js';
import { createLocalComplaintRateLimiter } from '../complaints/rate-limit.js';

export type RouteDefinition = {
  method: 'get' | 'post' | 'patch';
  path: string;
  operationId: string;
  tags: string[];
  summary: string;
  security?: 'bearerAuth' | 'optionalBearerAuth';
  requestBody?: 'bootstrap' | 'login' | 'publicComplaint' | 'complaintNotes' | 'complaintStatus';
  parameters?: object[];
  responses: number[];
  handlers: RequestHandler[];
};

const appVersion = '0.1.0';

function providerUnavailable(response: Parameters<RequestHandler>[1]): void {
  problem(
    response,
    501,
    'auth-provider-not-configured',
    'Authentication provider not configured',
    'The configured authentication provider is not available in this environment.',
  );
}

function localBootstrapUnavailable(response: Parameters<RequestHandler>[1]): void {
  problem(
    response,
    501,
    'auth-provider-not-configured',
    'Authentication provider not configured',
    'Local bootstrap is unavailable; configure the production authentication provider.',
  );
}

export function createRouteCatalog(localAuth: LocalAuth | null): RouteDefinition[] {
  const databaseUrl = process.env.DATABASE_URL;
  const pool = databaseUrl ? createDbPool(databaseUrl) : null;
  const complaintHandlers = pool
    ? createComplaintHandlers(
        createComplaintService(pool),
        createApplicationAuth(pool, localAuth).requirePermission,
        createLocalComplaintRateLimiter(),
      )
    : {
        submit: [
          (_request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => {
            providerUnavailable(response);
          },
        ],
        list: [
          (_request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => {
            providerUnavailable(response);
          },
        ],
        detail: [
          (_request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => {
            providerUnavailable(response);
          },
        ],
        notes: [
          (_request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => {
            providerUnavailable(response);
          },
        ],
        status: [
          (_request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) => {
            providerUnavailable(response);
          },
        ],
      };
  const routes: RouteDefinition[] = [
    {
      method: 'get',
      path: '/',
      operationId: 'getRoot',
      tags: ['System'],
      summary: 'Get service metadata',
      responses: [200],
      handlers: [
        (_request, response) => {
          response.json({
            name: "Jacky's Service Portal API",
            version: appVersion,
            status: 'ok',
            links: { api: '/api', health: '/health' },
          });
        },
      ],
    },
    {
      method: 'get',
      path: '/api',
      operationId: 'getApiInfo',
      tags: ['System'],
      summary: 'Get API metadata',
      responses: [200],
      handlers: [
        (_request, response) => {
          response.json({
            name: "Jacky's Service Portal API",
            version: appVersion,
            status: 'ok',
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
            capabilities: ['health', 'auth'],
          });
        },
      ],
    },
    {
      method: 'get',
      path: '/health',
      operationId: 'getHealth',
      tags: ['System'],
      summary: 'Check service health',
      responses: [200],
      handlers: [
        (_request, response) => {
          response.json({
            status: 'ok',
            service: 'jackys-service-portal',
            version: appVersion,
            timestamp: new Date().toISOString(),
          });
        },
      ],
    },
    {
      method: 'get',
      path: '/api/health',
      operationId: 'getApiHealth',
      tags: ['System'],
      summary: 'Check API health',
      responses: [200],
      handlers: [
        (_request, response) => {
          response.json({
            status: 'ok',
            service: 'jackys-service-portal',
            version: appVersion,
            timestamp: new Date().toISOString(),
          });
        },
      ],
    },
    {
      method: 'post',
      path: '/api/auth/bootstrap',
      operationId: 'bootstrapAuth',
      tags: ['Authentication'],
      summary: 'Create the one-time local development administrator',
      requestBody: 'bootstrap',
      responses: [201, 400, 401, 409, 501],
      handlers: [
        async (request, response, next) => {
          if (!localAuth) {
            localBootstrapUnavailable(response);
            return;
          }
          try {
            const result = await localAuth.bootstrap(request.body);
            if (result.kind === 'invalid-token') {
              problem(
                response,
                401,
                'invalid-bootstrap-token',
                'Unauthorized',
                'The bootstrap token is invalid.',
              );
              return;
            }
            if (result.kind === 'unavailable') {
              problem(
                response,
                409,
                'bootstrap-unavailable',
                'Bootstrap unavailable',
                'Local bootstrap has already been consumed for this process.',
              );
              return;
            }
            if (pool) {
              await ensureLocalAdminProfile(pool, result.user.email, result.user.name);
            }
            response.status(201).json({ token: result.token, user: result.user });
          } catch (error) {
            next(error);
          }
        },
      ],
    },
    {
      method: 'post',
      path: '/api/auth/login',
      operationId: 'loginAuth',
      tags: ['Authentication'],
      summary: 'Create a local development session',
      requestBody: 'login',
      responses: [200, 400, 401, 501],
      handlers: [
        async (request, response, next) => {
          if (!localAuth) {
            providerUnavailable(response);
            return;
          }
          try {
            const result = await localAuth.login(request.body);
            if (result.kind === 'invalid-credentials') {
              problem(
                response,
                401,
                'invalid-credentials',
                'Unauthorized',
                'The email or password is incorrect.',
              );
              return;
            }
            response.json({ token: result.token, user: result.user });
          } catch (error) {
            next(error);
          }
        },
      ],
    },
    {
      method: 'get',
      path: '/api/auth/me',
      operationId: 'getCurrentUser',
      tags: ['Authentication'],
      summary: 'Get the authenticated user',
      security: 'bearerAuth',
      responses: [200, 401, 501],
      handlers: [
        (request, response, next) => {
          if (!localAuth) {
            providerUnavailable(response);
            return;
          }
          localAuth.requireAuth(request, response, next);
        },
        (_request, response) => {
          response.json({ user: response.locals.auth.user as AuthUser });
        },
      ],
    },
    {
      method: 'post',
      path: '/api/auth/logout',
      operationId: 'logoutAuth',
      tags: ['Authentication'],
      summary: 'Revoke a local development session',
      security: 'optionalBearerAuth',
      responses: [204, 501],
      handlers: [
        (request, response) => {
          if (!localAuth) {
            providerUnavailable(response);
            return;
          }
          const authorization = request.header('authorization');
          const token = authorization?.startsWith('Bearer ')
            ? authorization.slice('Bearer '.length).trim()
            : undefined;
          if (token) localAuth.revokeToken(token);
          response.status(204).send();
        },
      ],
    },
    {
      method: 'get',
      path: '/api/auth/admin-check',
      operationId: 'adminCheck',
      tags: ['Authentication'],
      summary: 'Check dashboard permission',
      security: 'bearerAuth',
      responses: [200, 401, 403, 501],
      handlers: [
        localAuth?.requirePermission('dashboard.read') ??
          ((_request, response) => {
            providerUnavailable(response);
          }),
        (_request, response) => {
          response.json({ ok: true });
        },
      ],
    },
    ...[
      {
        method: 'post' as const,
        path: '/api/public/complaints',
        operationId: 'submitPublicComplaint',
        tags: ['Complaints'],
        summary: 'Submit a public complaint',
        requestBody: 'publicComplaint' as const,
        responses: [201, 400, 429, 500],
        handlers: complaintHandlers.submit,
      },
      {
        method: 'get' as const,
        path: '/api/complaints',
        operationId: 'listComplaints',
        tags: ['Complaints'],
        summary: 'List complaints',
        security: 'bearerAuth' as const,
        responses: [200, 400, 401, 403, 500],
        handlers: complaintHandlers.list,
      },
      {
        method: 'get' as const,
        path: '/api/complaints/{id}',
        operationId: 'getComplaint',
        tags: ['Complaints'],
        summary: 'Get a complaint',
        security: 'bearerAuth' as const,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: [200, 401, 403, 404, 500],
        handlers: complaintHandlers.detail,
      },
      {
        method: 'post' as const,
        path: '/api/complaints/{id}/notes',
        operationId: 'addComplaintNotes',
        tags: ['Complaints'],
        summary: 'Update complaint CCE notes',
        security: 'bearerAuth' as const,
        requestBody: 'complaintNotes' as const,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: [200, 400, 401, 403, 404, 500],
        handlers: complaintHandlers.notes,
      },
      {
        method: 'patch' as const,
        path: '/api/complaints/{id}/status',
        operationId: 'updateComplaintStatus',
        tags: ['Complaints'],
        summary: 'Change complaint status',
        security: 'bearerAuth' as const,
        requestBody: 'complaintStatus' as const,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: [200, 400, 401, 403, 404, 409, 500],
        handlers: complaintHandlers.status,
      },
    ],
  ];

  return routes;
}

export function registerRoutes(app: Express, routes: RouteDefinition[]): void {
  for (const route of routes) {
    const expressPath = route.path.replaceAll(/\{([^}]+)\}/g, ':$1');
    app[route.method](expressPath, ...route.handlers);
  }
}
