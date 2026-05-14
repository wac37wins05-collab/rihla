# ═══════════════════════════════════════════════════════════════════
#  autoinstall.ps1  —  STOURS / Rihla  ·  Auto-setup + Fly.io deploy
#  Right-click → "Run with PowerShell"   OR   powershell -File autoinstall.ps1
# ═══════════════════════════════════════════════════════════════════
Set-StrictMode -Off
$ErrorActionPreference = "Stop"

# ── Colours ──────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK    { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "    [!!] $msg" -ForegroundColor Yellow }
function Write-Fail  { param($msg) Write-Host "`n[ERREUR] $msg" -ForegroundColor Red; Read-Host "Appuyez sur Entrée pour quitter"; exit 1 }

Clear-Host
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "   STOURS / Rihla  —  Déploiement Fly.io automatique        " -ForegroundColor Magenta
Write-Host "============================================================`n" -ForegroundColor Magenta

# ── Allow script execution (current session only) ────────────────
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# ── Fly.io Token ─────────────────────────────────────────────────
if (-not $env:FLY_API_TOKEN) { Write-Fail "Définissez FLY_API_TOKEN dans votre environnement avant de déployer." }

$BACKEND_APP  = "stours-api"
$FRONTEND_APP = "stours-app"
$REGION       = "cdg"
$ROOT         = Split-Path -Parent $MyInvocation.MyCommand.Path

# ════════════════════════════════════════════════════════════════════
# STEP 1 — Install flyctl if missing
# ════════════════════════════════════════════════════════════════════
Write-Step "Vérification de flyctl..."

$flyPath = Get-Command fly -ErrorAction SilentlyContinue

if (-not $flyPath) {
    Write-Warn "flyctl non trouvé — installation automatique..."
    try {
        # Official Fly.io installer for Windows
        Invoke-WebRequest -Uri "https://fly.io/install.ps1" -UseBasicParsing | Invoke-Expression
        # Refresh PATH in current session
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH","User")
        $flyPath = Get-Command fly -ErrorAction SilentlyContinue
        if (-not $flyPath) {
            # Try common install location
            $flyExe = "$env:USERPROFILE\.fly\bin\fly.exe"
            if (Test-Path $flyExe) {
                $env:PATH += ";$env:USERPROFILE\.fly\bin"
                Write-OK "flyctl installé dans $env:USERPROFILE\.fly\bin"
            } else {
                Write-Fail "Installation de flyctl échouée. Installez manuellement: https://fly.io/docs/hands-on/install-flyctl/"
            }
        } else {
            Write-OK "flyctl installé: $(fly version)"
        }
    } catch {
        Write-Fail "Impossible d'installer flyctl: $_"
    }
} else {
    Write-OK "flyctl trouvé: $(fly version)"
}

# ════════════════════════════════════════════════════════════════════
# STEP 2 — Install Docker Desktop if missing
# ════════════════════════════════════════════════════════════════════
Write-Step "Vérification de Docker..."

$dockerOK = $false
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($dockerVersion) {
        Write-OK "Docker Engine $dockerVersion"
        $dockerOK = $true
    }
} catch {}

if (-not $dockerOK) {
    Write-Warn "Docker non trouvé ou non démarré."
    Write-Host "    Docker est nécessaire pour builder les images." -ForegroundColor Yellow
    Write-Host ""

    $install = Read-Host "    Voulez-vous télécharger Docker Desktop maintenant? (o/N)"
    if ($install -match "^[oOyY]") {
        Write-Step "Téléchargement de Docker Desktop..."
        $dockerInstaller = "$env:TEMP\DockerDesktopInstaller.exe"
        Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" `
                          -OutFile $dockerInstaller -UseBasicParsing
        Write-OK "Téléchargement terminé. Lancement de l'installateur..."
        Start-Process -FilePath $dockerInstaller -Wait
        Write-Warn "Redémarrez votre PC puis relancez ce script une fois Docker démarré."
        Read-Host "Appuyez sur Entrée pour quitter"
        exit 0
    } else {
        Write-Fail "Docker est requis. Installez-le depuis https://www.docker.com/products/docker-desktop/ puis relancez."
    }
}

# ════════════════════════════════════════════════════════════════════
# STEP 3 — Authenticate with Fly.io token
# ════════════════════════════════════════════════════════════════════
Write-Step "Authentification Fly.io..."
try {
    $whoami = fly auth whoami 2>&1
    Write-OK "Connecté : $whoami"
} catch {
    Write-Fail "Token Fly.io invalide ou expiré. Vérifiez FLY_API_TOKEN."
}

# ════════════════════════════════════════════════════════════════════
# STEP 4 — Deploy BACKEND
# ════════════════════════════════════════════════════════════════════
Write-Step "Déploiement du backend ($BACKEND_APP)..."

Set-Location "$ROOT\backend"

# Create app
$apps = fly apps list 2>&1
if ($apps -notmatch $BACKEND_APP) {
    Write-Warn "Création de l'app $BACKEND_APP..."
    fly apps create $BACKEND_APP --org personal
}

# Postgres
$pgList = fly postgres list 2>&1
if ($pgList -notmatch "stours-db") {
    Write-Warn "Création du cluster Postgres (stours-db)..."
    fly postgres create `
        --name stours-db `
        --region $REGION `
        --initial-cluster-size 1 `
        --vm-size shared-cpu-1x `
        --volume-size 3
    fly postgres attach stours-db --app $BACKEND_APP
    Write-OK "Postgres créé et attaché"
} else {
    Write-OK "Postgres 'stours-db' déjà existant"
}

# Secrets
Write-Warn "Configuration des secrets backend..."
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})
fly secrets set `
    --app $BACKEND_APP `
    JWT_SECRET="$jwtSecret" `
    ENVIRONMENT="production" `
    FRONTEND_URL="https://$FRONTEND_APP.fly.dev" `
    WORKERS="2"

# Deploy
Write-Warn "Build et déploiement du backend (peut prendre 3-5 min)..."
fly deploy --app $BACKEND_APP --region $REGION --wait-timeout 360
Write-OK "Backend déployé → https://$BACKEND_APP.fly.dev"

# ════════════════════════════════════════════════════════════════════
# STEP 5 — Deploy FRONTEND
# ════════════════════════════════════════════════════════════════════
Write-Step "Déploiement du frontend ($FRONTEND_APP)..."

Set-Location "$ROOT\frontend"

# Create app
$apps = fly apps list 2>&1
if ($apps -notmatch $FRONTEND_APP) {
    Write-Warn "Création de l'app $FRONTEND_APP..."
    fly apps create $FRONTEND_APP --org personal
}

# Secrets
fly secrets set `
    --app $FRONTEND_APP `
    BACKEND_URL="https://$BACKEND_APP.fly.dev"

# Deploy
Write-Warn "Build et déploiement du frontend (peut prendre 3-5 min)..."
fly deploy `
    --app $FRONTEND_APP `
    --region $REGION `
    --build-arg VITE_API_URL="https://$BACKEND_APP.fly.dev" `
    --wait-timeout 360
Write-OK "Frontend déployé → https://$FRONTEND_APP.fly.dev"

# ════════════════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════════════════
Set-Location $ROOT

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "   Déploiement terminé avec succès !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend  →  https://$FRONTEND_APP.fly.dev" -ForegroundColor Cyan
Write-Host "  API/Docs  →  https://$BACKEND_APP.fly.dev/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Commandes utiles:" -ForegroundColor White
Write-Host "    fly logs --app $BACKEND_APP       # logs backend" -ForegroundColor Gray
Write-Host "    fly logs --app $FRONTEND_APP      # logs frontend" -ForegroundColor Gray
Write-Host "    fly status --app $BACKEND_APP     # santé des machines" -ForegroundColor Gray
Write-Host ""

# Open in browser
$open = Read-Host "Ouvrir le site dans le navigateur? (o/N)"
if ($open -match "^[oOyY]") {
    Start-Process "https://$FRONTEND_APP.fly.dev"
}

Read-Host "`nAppuyez sur Entrée pour terminer"
