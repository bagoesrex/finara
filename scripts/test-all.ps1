# Finara Full Quality Gate Script (Windows PowerShell)
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
Write-Host "=== Running Full Finara Test Suite & CI Quality Gates ===" -ForegroundColor Cyan

# 1. Backend tests
Write-Host "`n--- [1/3] Backend Tests (Go) ---" -ForegroundColor Yellow
Push-Location "$RootDir\server"
try {
    go test -v ./...
    if ($LASTEXITCODE -ne 0) {
        throw "Go backend tests failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# 2. Frontend tests and build
Write-Host "`n--- [2/3] Frontend Tests & Production Build (Bun + Vite) ---" -ForegroundColor Yellow
Push-Location "$RootDir\client"
try {
    bun test
    if ($LASTEXITCODE -ne 0) {
        throw "Client unit tests failed with exit code $LASTEXITCODE"
    }
    bun run build
    if ($LASTEXITCODE -ne 0) {
        throw "Client build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

# 3. E2E Playwright Mobile Suite
Write-Host "`n--- [3/3] E2E Playwright Mobile Suite (Pixel 7) ---" -ForegroundColor Yellow
Push-Location "$RootDir\e2e"
try {
    bunx playwright test --project="Mobile Pixel 7"
    if ($LASTEXITCODE -ne 0) {
        throw "E2E Playwright tests failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

Write-Host "`n=== All Quality Gates Passed Successfully! ===" -ForegroundColor Green
