import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPI } from 'openapi-types';
import { createApp } from '../apps/api/src/app.js';
import { createOpenApiDocument } from '../apps/api/src/api/openapi.js';
import { createRouteCatalog } from '../apps/api/src/api/route-catalog.js';

async function withServer<T>(
  environment: Record<string, string>,
  callback: (baseUrl: string) => Promise<T>,
) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(environment)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }

  const server = http.createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');

  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test(
  'generated OpenAPI document validates and covers the route catalog',
  { concurrency: false },
  async () => {
    const routes = createRouteCatalog(null);
    const document = createOpenApiDocument(routes);
    await SwaggerParser.validate(document as OpenAPI.Document);

    assert.equal(document.openapi, '3.1.0');
    assert.equal(Object.keys(document.paths).length, routes.length);
    assert.ok(document.components?.schemas?.AuthUser);
    assert.ok(document.components?.securitySchemes?.bearerAuth);

    for (const route of routes) {
      const operation = document.paths[route.path]?.[route.method] as
        { operationId?: string } | undefined;
      assert.ok(operation);
      assert.equal(operation.operationId, route.operationId);
    }
  },
);

test(
  'local OpenAPI documentation is available only when explicitly enabled',
  { concurrency: false },
  async () => {
    await withServer(
      {
        NODE_ENV: 'development',
        AUTH_PROVIDER: 'local',
        OPENAPI_DOCS_ENABLED: 'true',
      },
      async (baseUrl) => {
        const contract = await fetch(`${baseUrl}/api/openapi.json`);
        assert.equal(contract.status, 200);
        assert.match(contract.headers.get('content-type') ?? '', /json/);
        assert.equal((await contract.json()).openapi, '3.1.0');

        const docs = await fetch(`${baseUrl}/api/docs`);
        assert.equal(docs.status, 200);
        assert.match(await docs.text(), /swagger-ui/);
        assert.match(docs.headers.get('content-security-policy') ?? '', /unsafe-inline/);

        const health = await fetch(`${baseUrl}/api/health`);
        assert.equal(health.status, 200);
        assert.doesNotMatch(
          health.headers.get('content-security-policy') ?? '',
          /script-src[^;]*unsafe-inline/,
        );
      },
    );
  },
);

test('documentation is disabled by default and in production', { concurrency: false }, async () => {
  await withServer(
    {
      NODE_ENV: 'development',
      AUTH_PROVIDER: 'local',
      OPENAPI_DOCS_ENABLED: 'false',
    },
    async (baseUrl) => {
      assert.equal((await fetch(`${baseUrl}/api/openapi.json`)).status, 404);
      assert.equal((await fetch(`${baseUrl}/api/docs`)).status, 404);
    },
  );

  await withServer(
    {
      NODE_ENV: 'production',
      AUTH_PROVIDER: 'local',
      OPENAPI_DOCS_ENABLED: 'true',
    },
    async (baseUrl) => {
      assert.equal((await fetch(`${baseUrl}/api/openapi.json`)).status, 404);
      assert.equal((await fetch(`${baseUrl}/api/docs`)).status, 404);
      const login = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'developer@example.test', password: 'local-password-1234' }),
      });
      assert.equal(login.status, 501);
    },
  );
});

test(
  'protected routes continue rejecting missing credentials',
  { concurrency: false },
  async () => {
    await withServer(
      {
        NODE_ENV: 'development',
        AUTH_PROVIDER: 'local',
        OPENAPI_DOCS_ENABLED: 'false',
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/auth/me`);
        assert.equal(response.status, 401);
        assert.equal(
          response.headers.get('content-type'),
          'application/problem+json; charset=utf-8',
        );
      },
    );
  },
);
