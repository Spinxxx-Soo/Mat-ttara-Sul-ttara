#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

section() {
  printf "\n[%s]\n" "$1"
}

check_cmd() {
  local cmd="$1"

  if command -v "$cmd" >/dev/null 2>&1; then
    printf "OK   %s\n" "$cmd"
  else
    printf "MISS %s\n" "$cmd"
  fi
}

check_file() {
  local path="$1"

  if [[ -f "$ROOT_DIR/$path" ]]; then
    printf "OK   %s\n" "$path"
  else
    printf "MISS %s\n" "$path"
  fi
}

print_hint() {
  printf "  %s\n" "$1"
}

section "project"
printf "root: %s\n" "$ROOT_DIR"

section "required commands"
check_cmd git
check_cmd node
check_cmd npm
check_cmd java
check_cmd python3
check_cmd docker

if docker compose version >/dev/null 2>&1; then
  printf "OK   docker compose\n"
else
  printf "MISS docker compose\n"
fi

section "tracked setup files"
check_file "AGENTS.md"
check_file "docs/HANDOFF.md"
check_file "FE/.env.example"
check_file "BE/.env.example"
check_file "AI/.env.example"

section "local env files"
check_file "FE/.env"
check_file "BE/.env"
check_file "AI/.env"

section "recommended next steps"
print_hint "Read docs/HANDOFF.md"
print_hint "Frontend:  cd FE && cp .env.example .env && npm install && npm run dev"
print_hint "Backend:   cd BE && cp .env.example .env && docker compose up -d"
print_hint "Backend:   cd BE && set -a && source .env && set +a && ./gradlew bootRun"
print_hint "AI:        cd AI && python3 -m venv .venv && source .venv/bin/activate"
print_hint "AI:        cd AI && pip install -r requirements.txt && cp .env.example .env && python3 main.py"

section "notes"
print_hint "Do not depend on hidden local folders such as FE/.agents for critical context."
print_hint "Prefer BE/.env over hardcoded values in application-local.yml."
print_hint "If anything here is wrong or incomplete, update docs/HANDOFF.md before handing off."
