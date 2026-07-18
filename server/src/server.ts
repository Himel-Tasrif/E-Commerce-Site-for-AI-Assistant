import { assertRuntimeEnv, env } from './config/env.js';
import { buildApp } from './app.js';

async function main() {
  assertRuntimeEnv();
  const app = await buildApp();
  await app.listen({ port: env.port, host: '0.0.0.0' });
  app.log.info(`Stride server listening on http://localhost:${env.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
