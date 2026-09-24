import type { RouteDefinition } from './route-catalog.js';

const problemResponse = {
  description: 'RFC 7807-style error response',
  content: {
    'application/problem+json': {
      schema: { $ref: '#/components/schemas/Problem' },
    },
  },
};

const responseDefinitions: Record<number, object> = {
  200: { description: 'Successful response' },
  201: { description: 'Resource created' },
  204: { description: 'No content' },
  400: problemResponse,
  401: problemResponse,
  403: problemResponse,
  409: problemResponse,
  500: problemResponse,
  501: problemResponse,
};

const requestBodies = {
  bootstrap: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/BootstrapRequest' },
      },
    },
  },
  login: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginRequest' },
      },
    },
  },
};

export function createOpenApiDocument(routes: RouteDefinition[]) {
  const paths: Record<string, Record<string, object>> = {};

  for (const route of routes) {
    const responses: Record<string, object> = {};
    for (const status of route.responses) {
      responses[String(status)] = responseDefinitions[status];
    }

    const operation: Record<string, unknown> = {
      operationId: route.operationId,
      tags: route.tags,
      summary: route.summary,
      responses,
    };
    if (route.security === 'bearerAuth') operation.security = [{ bearerAuth: [] }];
    if (route.security === 'optionalBearerAuth') operation.security = [{}, { bearerAuth: [] }];
    if (route.requestBody) operation.requestBody = requestBodies[route.requestBody];

    paths[route.path] ??= {};
    paths[route.path][route.method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: "Jacky's Service Portal API",
      version: '0.1.0',
      description: 'Local development contract for the service portal migration API.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'Opaque session token',
        },
      },
      schemas: {
        Problem: {
          type: 'object',
          required: ['type', 'title', 'status', 'detail'],
          properties: {
            type: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            status: { type: 'integer', minimum: 400, maximum: 599 },
            detail: { type: 'string' },
          },
        },
        AuthUser: {
          type: 'object',
          required: ['id', 'email', 'name', 'role', 'permissions'],
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'sales', 'management', 'admin'] },
            permissions: { type: 'array', items: { type: 'string' } },
          },
        },
        AuthSession: {
          type: 'object',
          required: ['token', 'user'],
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/AuthUser' },
          },
        },
        BootstrapRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['bootstrapToken', 'email', 'name', 'password'],
          properties: {
            bootstrapToken: { type: 'string', minLength: 32, maxLength: 256 },
            email: { type: 'string', format: 'email', maxLength: 320 },
            name: { type: 'string', minLength: 1, maxLength: 120 },
            password: { type: 'string', minLength: 12, maxLength: 200 },
          },
        },
        LoginRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', maxLength: 320 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
        ServiceMetadata: {
          type: 'object',
          required: ['name', 'version', 'status', 'links'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            status: { type: 'string', enum: ['ok'] },
            links: {
              type: 'object',
              required: ['api', 'health'],
              properties: {
                api: { type: 'string' },
                health: { type: 'string' },
              },
            },
          },
        },
        Health: {
          type: 'object',
          required: ['status', 'service', 'version', 'timestamp'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            service: { type: 'string' },
            version: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  };
}
