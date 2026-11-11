#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "=== Running Full Finara Test Suite & CI Quality Gates ==="

echo ""
echo "--- [1/3] Backend Tests (Go) ---"
cd "$ROOT_DIR/server"
go test -v ./...

echo ""
echo "--- [2/3] Frontend Tests & Production Build (Bun + Vite) ---"
cd "$ROOT_DIR/client"
bun test
bun run build

echo ""
echo "--- [3/3] E2E Playwright Mobile Suite (Pixel 7) ---"
cd "$ROOT_DIR/e2e"
bunx playwright test --project="Mobile Pixel 7"

echo ""
echo "=== All Quality Gates Passed Successfully! ==="
