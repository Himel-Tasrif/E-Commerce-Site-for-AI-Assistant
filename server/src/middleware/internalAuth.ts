import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { DomainError } from '../lib/errors.js';

export async function requireInternalSecret(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const header =
    (request.headers['x-internal-api-secret'] as string | undefined) ||
    (request.headers['authorization'] as string | undefined);

  let provided = header?.trim() || '';
  if (provided.toLowerCase().startsWith('bearer ')) {
    provided = provided.slice(7).trim();
  }

  if (!env.internalApiSecret || provided !== env.internalApiSecret) {
    throw new DomainError('UNAUTHORIZED', 'Invalid or missing INTERNAL_API_SECRET', 401);
  }
}
