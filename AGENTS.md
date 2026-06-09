# AGENTS.md

## Project Overview

IDC Device Asset Management System — full-stack app for data center device lifecycle management with 3D visualization. Monorepo: `backend/` (Express + Sequelize), `frontend/` (React + Vite + Ant Design + Three.js).

## 交互规则

1. 处理所有问题时，**全程思考过程必须使用中文**（包括需求分析、逻辑拆解、方案选择、步骤推导等所有内部推理环节）
2. 最终输出的所有回答内容（包括文字解释、代码注释、步骤说明等）**必须全部使用中文**，仅代码语法本身的英文关键词除外

## Quick Commands

```bash
# Install all dependencies (root + backend + frontend)
npm run install:all

# Start both backend (port 8000) and frontend (port 3000)
npm start

# Backend only
cd backend && npm run dev    # nodemon

# Frontend only
cd frontend && npm run dev   # vite
```

## Backend

- **Entry**: `backend/server.js` — initializes DB, syncs models, loads routes
- **DB**: SQLite (default) or MySQL, configured via `backend/.env` (`DB_TYPE`)
- **Routes**: config-driven at `backend/config/routes.js` — **adding a route requires editing this array**
- **Auth**: JWT; in dev, `JWT_SECRET` auto-generates if missing. Production requires it set in `.env`.
- **ORM sync**: dev mode uses `alter: true` for business models; production uses safe sync
- **Swagger**: served at `/api-docs`

## Frontend

- **Path alias**: `@/*` → `src/*` (configured in `jsconfig.json`)
- **Dev proxy**: `/api` and `/uploads` → `http://localhost:8000`
- **Port**: configurable via `.frontend-port` file or `FRONTEND_PORT` env var (default 3000)

## Testing

```bash
# Backend tests (Jest, in-memory SQLite — NOT the dev database)
cd backend && npm test                   # --runInBand
cd backend && npm run test:coverage

# Specific test files
cd backend && npx jest tests/operationLog.model.test.js --runInBand

# Frontend: vitest is in devDeps but no test scripts defined
```

Test setup (`backend/tests/setupEnv.js`): sets `NODE_ENV=test`, uses `:memory:` SQLite. Tests run with `force: true` sync.

## Lint & Format

```bash
# Backend
cd backend && npm run lint
cd backend && npm run format

# Frontend
cd frontend && npm run lint
cd frontend && npm run format

# Root-level Prettier config applies to both
```

**Note**: ESLint rules are very relaxed in both packages (many rules off). `lint` exits non-zero on warnings (`--max-warnings 0`).

## Node Version

`.nvmrc` specifies **20.10.0**.

## Project Conventions

- Backend is **CommonJS** (`require`); frontend is **ESM** (`import`)
- Backend logs via Winston (`backend/utils/logger.js`)
- API response pattern: `{ success: boolean, data?: ..., message?: ... }`
- Commit convention: `feat:`, `fix:`, `docs:`, `refactor:`, etc. (see README)
- Frontend uses Zustand for state, SWR for data fetching, Ant Design for UI

## Gotchas

- `npm start` uses `concurrently` to run both services; each must be installed separately first
- `backend/server.js` auto-creates `JWT_SECRET` in `.env` if missing in dev — don't commit the generated secret
- Database files (`*.db`, `*.sqlite`) are gitignored — local dev DB is ephemeral
- `backend/uploads/` and `backend/temp/` have `.gitkeep` files; contents are gitignored
- No CI workflows exist — lint/test must be run manually
