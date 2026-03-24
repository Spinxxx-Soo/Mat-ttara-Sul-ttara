# AGENTS.md

This repository contains a three-part service for the "matsul" project:

- `FE/`: React + TypeScript + Vite frontend
- `BE/`: Spring Boot backend
- `AI/`: FastAPI-based AI service and data collection scripts

Do not assume any hidden local agent folder exists on the next machine. Everything needed to restart work should be discoverable from tracked files in this repository.

## First 15 Minutes

1. Read `docs/HANDOFF.md`.
2. Run `scripts/bootstrap.sh`.
3. Start with the module you are modifying:
   - frontend: `FE/README.md`, `FE/docs/API_GUIDE.md`
   - backend: `BE/src/main/resources/application.yml`
   - ai: `AI/README.md`, `AI/apps/api/main.py`

## Repository Map

- `FE/src/app/router.tsx`: main route map
- `FE/src/app/App.tsx`: app bootstrap
- `FE/src/api/`: pure HTTP request layer
- `FE/src/hooks/queries/`: React Query layer
- `FE/src/stores/`: Zustand stores
- `BE/src/main/java/com/sulddara/server/`: Spring Boot domains
  - `auth`, `chat`, `place`, `plan`, `user`, `sse`
- `BE/src/main/resources/application.yml`: backend runtime config
- `AI/apps/api/main.py`: FastAPI app entry
- `AI/apps/api/chat.py`: AI HTTP endpoints
- `AI/apps/services/`: AI service orchestration
- `AI/scripts/`: data collection utilities

## Start Commands

### Frontend

```bash
cd FE
cp .env.example .env
npm install
npm run dev
```

### Backend

Use environment variables from `BE/.env.example`. The default `application.yml` reads from env vars.

```bash
cd BE
cp .env.example .env
docker compose up -d
set -a
source .env
set +a
./gradlew bootRun
```

### AI

```bash
cd AI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python3 main.py
```

## Working Rules

- Prefer tracked docs over hidden local context. If you learn something that the next agent will need, update `docs/HANDOFF.md`.
- Do not commit real secrets. Keep only placeholders in example env files.
- Treat `BE/src/main/resources/application-local.yml` as a local artifact, not as the source of truth for shared setup.
- Check `git status` before editing. There may be user-owned work in progress.
- When handing off, record:
  - current branch
  - dirty files
  - what was verified
  - next concrete task

## Project Conventions

### Frontend

- Keep API calls in `FE/src/api/`.
- Keep server state in React Query hooks under `FE/src/hooks/queries/`.
- Keep client-only global state in Zustand under `FE/src/stores/`.
- Prefer domain folders over putting more files directly in `FE/src/components/`.

### Backend

- Java 21 toolchain
- Spring Boot 3.4.x
- Infra dependencies expected locally: MySQL, Redis, Elasticsearch

### AI

- FastAPI + Uvicorn
- OpenAI-backed chat flow
- Separate env vars are used for chat runtime and review collection scripts

## Handoff Standard

Before leaving work for another agent or another PC, update `docs/HANDOFF.md` instead of relying on chat history or a local `.agents` folder.
