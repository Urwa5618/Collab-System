# Collab-System
A real-time collaborative document editor built with Node.js, React, PostgreSQL, Redis, and WebSockets

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-24-2496ED?logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-2C3E50?logo=open-source-initiative&logoColor=white)

> Currently in active development.

## Features
- ✅ User authentication (register, login, JWT)
- ✅ Workspace management with role-based access (owner, editor, viewer)
- ✅ Document CRUD with soft delete
- ✅ Member invitation system
- 🔄 Real-time collaborative editing (in progress)
- 🔄 Operational Transformation for conflict resolution (in progress)
- 📋 Presence and cursor tracking (planned)
- 📋 Version history and snapshots (planned)
- 📋 Offline sync (planned)

## Architecture
```
Browser → Cloudflare Tunnel → Windows Host
                                   │
                              Docker Network
                                   │
                   ┌───────────────┼───────────────┐
                Frontend        Backend          PostgreSQL
                (Vite/React)  (Express+WS)        Redis
                                   │              MinIO
                                   └── Docker Volumes (persistent)
```

- Frontend (Vite + React) delivers the editor UI and communicates with the backend over HTTP and WebSocket.
- Backend (Node.js + Express + Socket.IO) serves the REST API and real-time collaboration channel.
- PostgreSQL stores users, workspaces, documents, operations, and sessions.
- Redis provides fast access to canonical document state and presence tracking.
- MinIO (dev) / Cloudflare R2 (prod) stores snapshots and large document blobs.
- Docker volumes keep database and object storage data persistent across restarts.

## Tech Stack
| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | UI |
| Editor | Tiptap | Rich text editing |
| Backend | Node.js + Express + TypeScript | REST API + WebSocket server |
| Real-time | Socket.io | WebSocket connections |
| OT Engine | Custom implementation | Conflict resolution |
| Database | PostgreSQL 16 | Persistent storage |
| Cache | Redis 7 | Canonical document state, presence |
| Blob Storage | MinIO (dev) / Cloudflare R2 (prod) | Document snapshots |
| Infrastructure | Docker + Docker Compose | Local development |
| Tunnel | Cloudflare Tunnel | Public access |

## Database Schema
- `users` — registered user accounts
- `workspaces` — containers for documents, owned by a user
- `workspace_members` — join table for workspace access control
- `documents` — individual documents with soft delete
- `operations` — append-only op-log for all document edits
- `snapshots` — periodic document snapshots stored in MinIO
- `sessions` — user session tracking

## API Reference
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login and get JWT |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/workspaces` | Yes | List user workspaces |
| POST | `/api/workspaces` | Yes | Create workspace |
| GET | `/api/workspaces/:id` | Yes | Get workspace |
| PATCH | `/api/workspaces/:id` | Yes | Update workspace |
| DELETE | `/api/workspaces/:id` | Yes | Delete workspace |
| GET | `/api/workspaces/:id/members` | Yes | List members |
| POST | `/api/workspaces/:id/members` | Yes | Add member |
| DELETE | `/api/workspaces/:id/members/:userId` | Yes | Remove member |
| POST | `/api/workspaces/:id/documents` | Yes | Create document |
| GET | `/api/workspaces/:id/documents` | Yes | List documents |
| GET | `/api/documents/:id` | Yes | Get document |
| PATCH | `/api/documents/:id` | Yes | Update document |
| DELETE | `/api/documents/:id` | Yes | Delete document |

## Local Development Setup
**Prerequisites**
- Docker Desktop
- Node.js 20+
- Git

**Steps**
1. Clone the repo.
2. Copy `.env.example` to `.env` and fill values.
3. Run `docker compose up --build`.
4. Visit `http://localhost:3000` for frontend.
5. Visit `http://localhost:8080/api/health` for backend.
6. Visit `http://localhost:9001` for MinIO console.

Note: On Windows with WSL2, the frontend remains accessible at `http://localhost:3000`.

## Environment Variables
- `POSTGRES_USER` — PostgreSQL username
- `POSTGRES_PASSWORD` — PostgreSQL password
- `POSTGRES_DB` — PostgreSQL database name
- `DATABASE_URL` — PostgreSQL connection string used by the backend
- `REDIS_URL` — Redis connection string
- `MINIO_ROOT_USER` — MinIO root username for local dev
- `MINIO_ROOT_PASSWORD` — MinIO root password for local dev
- `MINIO_ENDPOINT` — MinIO host name or address
- `MINIO_PORT` — MinIO port (default 9000)
- `MINIO_BUCKET` — Bucket for document snapshots
- `PORT` — Backend HTTP port
- `NODE_ENV` — Runtime environment (development, production)
- `JWT_SECRET` — Secret used to sign JWTs
- `CORS_ORIGIN` — Allowed CORS origin(s) for the backend
- `VITE_API_URL` — Frontend API base URL
- `VITE_WS_URL` — Frontend WebSocket base URL

## Project Structure
```
Collab-System/
├── .env
├── .env.example
├── .git/
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/
│       │   ├── db.ts
│       │   ├── minio.ts
│       │   └── redis.ts
│       ├── db/
│       │   ├── migrate.ts
│       │   └── migrations/
│       │       ├── .gitkeep
│       │       ├── 001_create_extensions.sql
│       │       ├── 002_create_users.sql
│       │       ├── 003_create_workspaces.sql
│       │       ├── 004_create_documents.sql
│       │       ├── 005_create_operations.sql
│       │       ├── 006_create_snapshots.sql
│       │       └── 007_create_sessions.sql
│       ├── index.ts
│       ├── middleware/
│       │   ├── auth.ts
│       │   └── errorHandler.ts
│       ├── ot/
│       │   └── .gitkeep
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── documents.ts
│       │   ├── index.ts
│       │   └── workspaces.ts
│       ├── services/
│       │   ├── .gitkeep
│       │   ├── authService.ts
│       │   ├── documentService.ts
│       │   └── workspaceService.ts
│       ├── types/
│       │   └── index.ts
│       └── ws/
│           └── index.ts
├── docker-compose.prod.yml
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── components/
│       │   └── .gitkeep
│       ├── hooks/
│       │   └── .gitkeep
│       ├── lib/
│       │   └── .gitkeep
│       ├── main.tsx
│       └── pages/
│           └── .gitkeep
├── LICENSE
└── README.md
```

## Roadmap
- Phase 1: Project scaffold + Docker ✅
- Phase 2: Database schema + migrations ✅
- Phase 3: REST API ✅
- Phase 4: WebSocket server 🔄
- Phase 5: OT engine 🔄
- Phase 6: Rich text editor + WS client 📋
- Phase 7: Presence + cursors 📋
- Phase 8: Versioning + snapshots 📋
- Phase 9: Offline sync 📋
- Phase 10: Locking protocol 📋
- Phase 11: Cloudflare Tunnel + deployment 📋

## License
MIT License
