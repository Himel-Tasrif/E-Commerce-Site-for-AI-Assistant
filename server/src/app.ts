import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { DomainError } from './lib/errors.js';
import { healthRoutes } from './modules/health/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { customerRoutes } from './modules/customers/routes.js';
import { orderRoutes } from './modules/orders/routes.js';
import { checkoutRoutes } from './modules/checkout/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { storefrontRoutes } from './modules/storefront/routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  await app.register(cors, {
    origin: true,
  });

  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof DomainError) {
      return reply.status(err.statusCode).send({
        ok: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }
    if (err instanceof ZodError) {
      return reply.status(400).send({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: err.flatten(),
        },
      });
    }

    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    app.log.error(err);
    return reply.status(statusCode).send({
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Internal server error' : (err as Error).message,
      },
    });
  });

  await app.register(healthRoutes);
  await app.register(settingsRoutes);
  await app.register(customerRoutes);
  await app.register(orderRoutes);
  await app.register(checkoutRoutes);
  await app.register(storefrontRoutes);
  await app.register(adminRoutes);

  return app;
}
