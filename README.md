# Augmented Reality Project

This is an Augmented Reality project with:
- **Web Application (Designer Tool)**: React + TypeScript + Vite + Tailwind
- **Mobile Application (End User)**: To be determined (React Native/Flutter/etc. under consideration)
- **Backend API**: Node.js + TypeScript + Fastify + Prisma with Supabase (PostgreSQL & Storage)

## Project Structure

```
Augmented Reality/
├── frontend/           # React + Vite + TypeScript + Tailwind
├── backend/            # Node.js + TypeScript + Fastify + Prisma
├── documents/          # Project documentation, blueprints, requirements
├── openspec/           # OpenSpec files
├── .claude/            # Claude Code settings
├── package.json        # Root package.json (pnpm workspace)
└── README.md
```

## Development Commands

### Backend (Node.js + TypeScript + Fastify + Prisma)
- Start development server: `pnpm dev:backend`
- Run tests: `pnpm test:backend`
- Lint code: `pnpm lint:backend`
- Database migrations:
  - Generate migration: `pnpm prisma migrate dev --name <migration-name>`
  - Apply migration: `pnpm prisma migrate deploy`
  - Studio GUI: `pnpm prisma studio`

### Frontend (React + TypeScript + Vite + Tailwind)
- Start dev server: `pnpm dev:frontend`
- Run tests: `pnpm test:frontend`
- Lint code: `pnpm lint:frontend`
- Build for production: `pnpm build:frontend`
- Preview production build: `pnpm preview:frontend`

### Root Level (using pnpm workspaces)
- Start both: `pnpm dev`
- Test all: `pnpm test`
- Lint all: `pnpm lint`
- Build all: `pnpm build`

## Environment Setup

1. Copy `.env.example` to `.env` in the backend directory and fill in your Supabase credentials.
2. Install dependencies: `pnpm install` (run from root)
3. Run database migrations: `pnpm prisma migrate dev` (from backend directory)

## Architecture

Please refer to the documents in the `documents/` directory, especially the blueprint folder for architectural diagrams.

## License

ISC