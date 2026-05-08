# Te Pinta 2.0

Sistema interno de gestión para el emprendimiento de empanadas **Te Pinta**.

## Stack planificado

- Monorepo: pnpm workspaces + Turborepo
- Web: React 19 + Vite + TypeScript
- API: Express + TypeScript
- Shared: Zod schemas, types and pricing utilities
- DB: PostgreSQL + Drizzle

## Scripts

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Seguridad de entorno

Las credenciales reales van en `.env` y no se commitean. Los ejemplos deben vivir en `.env.example`.
