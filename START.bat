@echo off
chcp 65001 >nul
echo.
echo  ██████╗ ██╗██╗  ██╗██╗      █████╗
echo  ██╔══██╗██║██║  ██║██║     ██╔══██╗
echo  ██████╔╝██║███████║██║     ███████║
echo  ██╔══██╗██║██╔══██║██║     ██╔══██║
echo  ██║  ██║██║██║  ██║███████╗██║  ██║
echo  ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
echo.
echo  Platform SaaS DMC - STOURS VOYAGES
echo  =====================================
echo.

:: Nettoyage des processus précédents
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul

:: Vérifier si les dépendances Python sont installées
echo [1/4] Vérification des dépendances Python...
cd /d "%~dp0backend"
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo      Installation des packages Python...
    pip install -r requirements.txt --quiet
    if errorlevel 1 (
        echo  ERREUR: pip install a échoué. Vérifie que Python 3.11+ est installé.
        pause
        exit /b 1
    )
    echo      Packages Python installes.
) else (
    echo      Dependances Python OK.
)

:: Vérifier si la base de données existe, sinon seeder
echo [2/4] Initialisation de la base de données...
if not exist "dev.db" (
    echo      Creation de la base SQLite et du compte admin...
    python -m scripts.seed_admin
    if errorlevel 1 (
        echo  AVERTISSEMENT: Seed echoue - continuons quand meme...
    )
) else (
    echo      Base de donnees existante.
)

:: Vérifier les dépendances npm
echo [3/4] Vérification des dépendances Node.js...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo      Installation des packages npm...
    call npm install --silent
)
echo      Dependances Node.js OK.

:: Lancement du Backend FastAPI
echo [4/4] Lancement des serveurs...
cd /d "%~dp0backend"
start "RIHLA BACKEND (API :8000)" cmd /k "python -m uvicorn app.main:app --reload --port 8000 --log-level info"

:: Attendre que le backend démarre
timeout /t 3 /nobreak >nul

:: Lancement du Frontend Vite
cd /d "%~dp0frontend"
start "RIHLA FRONTEND (:5173)" cmd /k "npm run dev"

echo.
echo  ============================================
echo   RIHLA est en cours de demarrage...
echo  ============================================
echo.
echo   Backend API  : http://localhost:8000
echo   Frontend App : http://localhost:5173
echo   Swagger Docs : http://localhost:8000/docs
echo.
echo   Login : a.chakir@stours.ma
echo   Pass  : <mot_de_passe_admin_local>
echo.
echo   Attends 10-15 secondes puis ouvre :
echo   http://localhost:5173
echo.
pause
