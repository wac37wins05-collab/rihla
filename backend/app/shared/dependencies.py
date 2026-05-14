"""Shared FastAPI dependencies — auth, RBAC, tenant isolation, pagination.

Usage in routers:
    from app.shared.dependencies import require_auth, require_role, get_tenant_id

    # Simple auth check (no tenant enforcement):
    @router.get("/", dependencies=[Depends(require_auth)])
    def list_items(...): ...

    # Tenant-scoped endpoint (preferred for all business data):
    @router.get("/projects")
    def list_projects(
        company_id: str = Depends(get_tenant_id),
        current_user: dict = Depends(require_auth),
        db: Session = Depends(get_db),
    ):
        return db.query(Project).filter(Project.company_id == company_id).all()

    # Role enforcement:
    @router.delete("/{id}", dependencies=[Depends(require_role("super_admin"))])
    def delete_item(...): ...

MULTI-TENANT RULES
──────────────────
• Every business entity (Project, Quotation, Invoice, etc.) carries a company_id FK.
• All list/get/create endpoints must filter or set company_id using get_tenant_id().
• super_admin bypasses tenant isolation (cross-tenant management).
• A user without a company_id in their JWT receives HTTP 403.
"""

from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user


async def require_auth(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that enforces JWT authentication.
    Returns the decoded token payload (sub, email, role, permissions, company_id).
    """
    return current_user


async def get_tenant_id(current_user: dict = Depends(get_current_user)) -> str:
    """Extract and validate company_id from the JWT token.

    Raises HTTP 403 if the token has no company_id claim (user not enrolled
    in any company yet).

    Returns:
        company_id (str) — the caller's active tenant.
    """
    # super_admin can pass a x-company-id header for cross-tenant ops,
    # but for now we simply require the claim in the token.
    company_id: str | None = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Aucune organisation associée à ce compte. "
                "Contactez votre administrateur pour être rattaché à une agence."
            ),
        )
    return company_id


def require_role(*allowed_roles: str):
    """Factory returning a dependency that enforces role-based access."""
    async def _check_role(current_user: dict = Depends(get_current_user)) -> dict:
        role = current_user.get("role", "")
        if role not in allowed_roles and "super_admin" not in [role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis : {', '.join(allowed_roles)}",
            )
        return current_user
    return _check_role


def require_permission(permission: str):
    """Factory returning a dependency that enforces a specific permission."""
    async def _check_permission(current_user: dict = Depends(get_current_user)) -> dict:
        perms = current_user.get("permissions", [])
        if "*" not in perms and permission not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission requise : {permission}",
            )
        return current_user
    return _check_permission
