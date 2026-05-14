"""
Guard — blocks accidental execution of demo seed scripts in production.

Usage at top of any demo seed script:
    from scripts._dev_guard import require_dev_env
    require_dev_env()

Set ENVIRONMENT=development or RIHLA_SEED_ALLOW=1 to allow execution.
"""
import os
import sys


def require_dev_env(script_name: str = "") -> None:
    """Abort if not running in development/test environment.

    Checks (in order):
      1. RIHLA_SEED_ALLOW=1   — emergency override (use with caution)
      2. ENVIRONMENT=development or ENVIRONMENT=test — standard dev envs
      3. NODE_ENV=development  — alternate convention

    Raises SystemExit if none of the above conditions are met.
    """
    if os.getenv("RIHLA_SEED_ALLOW") == "1":
        print("⚠️  RIHLA_SEED_ALLOW override active — proceeding in any environment")
        return

    env = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "")).lower()

    if env in ("development", "dev", "test", "local"):
        return

    label = f" ({script_name})" if script_name else ""
    print(
        f"\n🚫  BLOQUÉ{label} — Ce script crée des données de démonstration.\n"
        f"   Il ne peut s'exécuter qu'en environnement de développement.\n\n"
        f"   ENVIRONMENT actuel : '{env or '(non défini)'}'\n\n"
        f"   Pour autoriser :\n"
        f"     • Définir ENVIRONMENT=development dans votre .env\n"
        f"     • Ou passer RIHLA_SEED_ALLOW=1 (urgence uniquement)\n",
        file=sys.stderr,
    )
    sys.exit(1)
