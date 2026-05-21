"""Enterprise RBAC permission catalog."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from app.modules.auth.models import RoleEnum


class PermissionLike(Protocol):
    name: str

FULL_ACCESS_ROLES = {
    RoleEnum.SUPER_ADMIN.value,
    RoleEnum.CEO.value,
    RoleEnum.DIRECTOR.value,
}

ROLE_ALIASES = {
    "horizon_transport": RoleEnum.HORIZON_TRANSPORT.value,
    "transport": RoleEnum.HORIZON_TRANSPORT.value,
    "transport_manager": RoleEnum.HORIZON_TRANSPORT.value,
    "accounting": RoleEnum.ACCOUNTING_MANAGER.value,
    "accounting_manager": RoleEnum.ACCOUNTING_MANAGER.value,
    "contracting": RoleEnum.CONTRACTING_MANAGER.value,
    "contracting_manager": RoleEnum.CONTRACTING_MANAGER.value,
    "ceo": RoleEnum.CEO.value,
    "director": RoleEnum.DIRECTOR.value,
    "super_admin": RoleEnum.SUPER_ADMIN.value,
}

ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    RoleEnum.TRAVEL_DESIGNER.value: (
        "crm:read",
        "crm:write",
        "crm:pipeline",
        "client_requests:write",
        "itineraries:write",
        "proposals:generate",
        "quotations:create",
    ),
    RoleEnum.CONTRACTING_MANAGER.value: (
        "suppliers:read",
        "suppliers:write",
        "contracts:write",
        "rates:write",
        "guides:write",
        "activities:write",
        "restaurants:write",
        "hotels:write",
    ),
    RoleEnum.HORIZON_TRANSPORT.value: (
        "transport:read",
        "transport:write",
        "vehicles:assign",
        "drivers:assign",
        "dispatch:manage",
        "incidents:track",
    ),
    RoleEnum.ACCOUNTING_MANAGER.value: (
        "accounting:read",
        "accounting:write",
        "invoices:write",
        "payments:write",
        "supplier_invoices:write",
        "reports:accounting",
        "exports:accounting",
    ),
    RoleEnum.CEO.value: ("*",),
    RoleEnum.SUPER_ADMIN.value: ("*",),
    RoleEnum.DIRECTOR.value: ("*",),
    RoleEnum.SALES_DIRECTOR.value: (
        "crm:read",
        "crm:write",
        "crm:pipeline",
        "crm:reporting",
        "quotations:create",
        "reports:sales",
    ),
    RoleEnum.SALES_AGENT.value: (
        "crm:read",
        "crm:write",
        "crm:pipeline",
        "client_requests:write",
        "quotations:create",
    ),
    RoleEnum.QUOTATION_OFFICER.value: (
        "crm:read",
        "itineraries:write",
        "proposals:generate",
        "quotations:create",
    ),
    RoleEnum.DATA_OPERATOR.value: (
        "crm:read",
        "suppliers:read",
        "transport:read",
    ),
    RoleEnum.SUB_AGENT.value: (
        "crm:read",
        "quotations:create",
    ),
    RoleEnum.CLIENT.value: (
        "client_portal:read",
    ),
    RoleEnum.GUIDE.value: (
        "field_ops:read",
        "field_ops:write",
    ),
    RoleEnum.DRIVER.value: (
        "transport:read",
        "incidents:track",
    ),
}


def normalize_role(role: str | RoleEnum | None) -> str:
    if isinstance(role, RoleEnum):
        role_value = role.value
    else:
        role_value = str(role or "")
    role_value = role_value.lower()
    return ROLE_ALIASES.get(role_value, role_value)


def permissions_for_role(role: str | RoleEnum | None) -> list[str]:
    return list(ROLE_PERMISSIONS.get(normalize_role(role), ()))


def permission_names_for_role(
    role: str | RoleEnum | None,
    db_permissions: Iterable[PermissionLike] | None = None,
) -> list[str]:
    names = {permission.name for permission in db_permissions or []}
    names.update(permissions_for_role(role))
    return sorted(names)


def has_permission(role: str | RoleEnum | None, permissions: list[str] | None, permission: str) -> bool:
    role_name = normalize_role(role)
    if role_name in FULL_ACCESS_ROLES:
        return True

    effective_permissions = set(permissions or [])
    effective_permissions.update(permissions_for_role(role_name))
    if "*" in effective_permissions or permission in effective_permissions:
        return True

    module = permission.split(":", 1)[0]
    return f"{module}:*" in effective_permissions
