# HANDOFF

Last updated: 2026-03-23

## Snapshot

- Repository root: `/home/iidx/2nd`
- Current branch when this handoff was written: `temp-resolve-conflict`
- Dirty file observed before changes: `BE/docker-compose.yml`
- Recent commits:
  - `36063ef` Merge branch `temp-resolve-conflict` into `develop`
  - `3a04ca1` docs: ignore manifest and .gitignore itself
  - `a7fb02e` fix: implement concurrent enrichment deduplication for same placeId
  - `b0d28dc` Merge branch `refactor/S14P21B205-367-error-handling-standardization` into `develop`
  - `42c2cc8` refactor: resolve merge conflicts and align auth domain with conventions (S14P21B205-367)

## Product Summary

This project is a restaurant recommendation and plan management service.

- frontend responsibilities: login, onboarding, map exploration, plan CRUD, chat UI
- backend responsibilities: auth, place/plan/user APIs, websocket or SSE-related server features, search/cache infrastructure
- ai responsibilities: chat recommendation flow and review/place data collection

## Where To Start

1. Run `scripts/bootstrap.sh`.
2. Read the module-specific docs:
   - frontend: `FE/README.md`, `FE/docs/API_GUIDE.md`
   - backend: `BE/src/main/resources/application.yml`
   - ai: `AI/README.md`, `AI/apps/api/main.py`
3. Confirm local env files exist:
   - `FE/.env`
   - `BE/.env`
   - `AI/.env`
4. Bring up backend infra with `cd BE && docker compose up -d`.

## Key Entry Points

### Frontend

- `FE/src/app/router.tsx`: route structure
- `FE/src/app/App.tsx`: app composition
- `FE/src/api/axios.ts`: HTTP client and interceptors
- `FE/src/config/env.ts`: frontend env parsing

### Backend

- `BE/src/main/java/com/sulddara/server/ServerApplication.java`: Spring Boot entry
- `BE/src/main/resources/application.yml`: backend env-driven config
- domain packages:
  - `auth`
  - `chat`
  - `place`
  - `plan`
  - `user`
  - `sse`

### AI

- `AI/main.py`: Uvicorn launch entry
- `AI/apps/api/main.py`: FastAPI app
- `AI/apps/api/chat.py`: chat-related routes
- `AI/apps/services/`: orchestration and memory/preference logic
- `AI/scripts/collect_places.py`: Google Places collection
- `AI/scripts/save_reviews.py`: review ingestion into MySQL

## Known Gaps And Risks

- `FE/README.md` says `pnpm`, but the repo currently tracks `FE/package-lock.json`. Use `npm` as the default unless the team standard changes.
- `BE/README.md` is effectively empty.
- `AI/README.md` is partially stale:
  - it references `AI/.env.example`, which was missing before this handoff
  - it references `AI/scripts/init_db.py`, but that file does not exist in the current tree
- `BE/src/main/resources/application-local.yml` contains hardcoded local secrets and credentials. Do not treat it as portable setup. Prefer env vars from `BE/.env`.
- Root `.env.local` is gitignored and machine-local. Do not rely on it for shared onboarding.
- Backend local infra expects MySQL on `3306`, Redis on `6379`, Elasticsearch on `9200`.

## Practical Defaults

### Frontend

- stack: React 18, TypeScript, Vite, React Query, Zustand, Axios
- start: `cd FE && npm install && npm run dev`
- env source: `FE/.env.example`

### Backend

- stack: Spring Boot 3.4, Java 21, JPA, Security, OAuth2, Redis, Elasticsearch
- start infra: `cd BE && docker compose up -d`
- app run: `cd BE && set -a && source .env && set +a && ./gradlew bootRun`
- env source: `BE/.env.example`

### AI

- stack: FastAPI, Uvicorn, LangChain, OpenAI client
- start: `cd AI && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python3 main.py`
- env source: `AI/.env.example`

## Recommended Next Cleanup

1. Replace hardcoded secrets in `application-local.yml` and rotate any credentials that were ever committed.
2. Fill `BE/README.md` with actual startup instructions.
3. Reconcile `AI/README.md` with the current code and either restore or remove `init_db.py` references.
4. Decide whether the frontend standard package manager is `npm` or `pnpm`, then align docs and lockfiles.
5. Keep this file current whenever branch status, env requirements, or startup flow changes.

## If You Are The Next Agent

- Start by summarizing `git status` and what you plan to change.
- Avoid relying on hidden editor state or prior chat context.
- If you discover a missing prerequisite, add it here once confirmed.
