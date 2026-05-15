"""CRM router — /api/crm.

Exposes a full Customer-Relationship-Management API:
- accounts (B2B agencies, direct customers, MICE…)
- contacts (people inside an account)
- activities (call/meeting/email/note timeline)
- deals (sales pipeline, Kanban)
- tasks (next-best-actions)
- 360° view (one endpoint returning everything for an account)
- pipeline view (Kanban grouped by stage)
- pipeline DMC (10-stage DMC kanban)
- dashboard KPIs
- leads (multi-channel inbox + scoring + qualification)
- scoring (RFM recompute)
- reporting (revenue, markets, win/loss, NPS, churn, forecast)
- nurturing (email sequences)
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.tenant import get_current_company_id
from app.shared.dependencies import require_auth, require_permission

from app.modules.crm.models import (
    CrmAccount, CrmContact, CrmActivity, CrmDeal, CrmTask,
    CrmLead, CrmNurturingSequence, CrmNurturingRun,
)
from app.modules.crm import schemas as S
from app.modules.crm import (
    lead_intake, lead_scoring, scoring, reporting, nurturing
)


router = APIRouter(
    prefix="/crm",
    tags=["crm"],
    dependencies=[Depends(require_permission("crm:read"))],
)

CRM_WRITE = Depends(require_permission("crm:write"))
CRM_PIPELINE = Depends(require_permission("crm:pipeline"))
CRM_REPORTING = Depends(require_permission("crm:reporting"))


# ── helpers ────────────────────────────────────────────────────────────────
PIPELINE_STAGES = [
    ("qualification", "Qualification"),
    ("proposal",      "Proposition"),
    ("negotiation",   "Négociation"),
    ("won",           "Gagné"),
    ("lost",          "Perdu"),
]
OPEN_STAGES = {"qualification", "proposal", "negotiation"}


def _account_or_404(db: Session, company_id: str, account_id: str) -> CrmAccount:
    a = (
        db.query(CrmAccount)
        .filter(CrmAccount.company_id == company_id, CrmAccount.id == account_id, CrmAccount.active == True)
        .first()
    )
    if not a:
        raise HTTPException(404, "Account not found")
    return a


def _now() -> datetime:
    # Naive UTC to align with SQLite-stored values
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _log_activity(db: Session, *, company_id: str, account_id: str,
                  type_: str, title: str, description: str | None = None,
                  deal_id: str | None = None, owner_user_id: str | None = None) -> None:
    db.add(CrmActivity(
        company_id=company_id, account_id=account_id, deal_id=deal_id,
        type=type_, title=title, description=description,
        occurred_at=_now(), owner_user_id=owner_user_id,
    ))


# ── Accounts ───────────────────────────────────────────────────────────────
@router.get("/accounts", response_model=list[S.AccountOut])
def list_accounts(
    q: Optional[str] = Query(None, description="search by name/email/country"),
    tier: Optional[str] = None,
    lifecycle_stage: Optional[str] = None,
    account_type: Optional[str] = None,
    country: Optional[str] = None,
    owner_user_id: Optional[str] = None,
    limit: int = Query(200, le=1000),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    query = db.query(CrmAccount).filter(
        CrmAccount.company_id == company_id, CrmAccount.active == True,
    )
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            func.lower(CrmAccount.name).like(like)
            | func.lower(CrmAccount.primary_email).like(like)
            | func.lower(CrmAccount.country).like(like)
        )
    if tier:
        query = query.filter(CrmAccount.tier == tier)
    if lifecycle_stage:
        query = query.filter(CrmAccount.lifecycle_stage == lifecycle_stage)
    if account_type:
        query = query.filter(CrmAccount.account_type == account_type)
    if country:
        query = query.filter(CrmAccount.country == country)
    if owner_user_id:
        query = query.filter(CrmAccount.owner_user_id == owner_user_id)
    return query.order_by(CrmAccount.updated_at.desc()).limit(limit).all()


@router.post("/accounts", response_model=S.AccountOut, status_code=201)
def create_account(
    data: S.AccountIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = CrmAccount(company_id=company_id, **data.model_dump())
    db.add(row)
    db.flush()
    _log_activity(db, company_id=company_id, account_id=row.id,
                  type_="note", title=f"Compte créé: {row.name}")
    db.commit()
    db.refresh(row)
    return row


@router.get("/accounts/{account_id}", response_model=S.AccountOut)
def get_account(
    account_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    return _account_or_404(db, company_id, account_id)


@router.patch("/accounts/{account_id}", response_model=S.AccountOut)
def update_account(
    account_id: str,
    data: S.AccountUpdate,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = _account_or_404(db, company_id, account_id)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(
    account_id: str,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = _account_or_404(db, company_id, account_id)
    row.active = False
    db.commit()
    return None


# ── Account 360 ────────────────────────────────────────────────────────────
@router.get("/accounts/{account_id}/360", response_model=S.Account360)
def account_360(
    account_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    a = _account_or_404(db, company_id, account_id)

    contacts = (
        db.query(CrmContact)
        .filter(CrmContact.company_id == company_id, CrmContact.account_id == account_id, CrmContact.active == True)
        .order_by(CrmContact.is_primary.desc(), CrmContact.created_at.asc())
        .all()
    )
    activities = (
        db.query(CrmActivity)
        .filter(CrmActivity.company_id == company_id, CrmActivity.account_id == account_id)
        .order_by(CrmActivity.occurred_at.desc())
        .limit(50)
        .all()
    )
    deals = (
        db.query(CrmDeal)
        .filter(CrmDeal.company_id == company_id, CrmDeal.account_id == account_id, CrmDeal.active == True)
        .order_by(CrmDeal.created_at.desc())
        .all()
    )
    tasks = (
        db.query(CrmTask)
        .filter(CrmTask.company_id == company_id, CrmTask.account_id == account_id,
                CrmTask.completed_at.is_(None), CrmTask.active == True)
        .order_by(CrmTask.due_date.asc().nullslast() if hasattr(CrmTask.due_date.asc(), "nullslast") else CrmTask.due_date.asc())
        .all()
    )

    open_deals = [d for d in deals if d.stage in OPEN_STAGES]
    won_deals = [d for d in deals if d.stage == "won"]
    lost_deals = [d for d in deals if d.stage == "lost"]
    pipeline_value = float(sum(float(d.amount_mad or 0) for d in open_deals))
    won_revenue = float(sum(float(d.amount_mad or 0) for d in won_deals))
    total_proj = len(deals)
    conv = (len(won_deals) / total_proj * 100.0) if total_proj else 0.0
    cutoff = _now() - timedelta(days=30)
    activities_30d = sum(1 for ev in activities if ev.occurred_at and ev.occurred_at >= cutoff)

    stats = S.AccountStats(
        total_projects=total_proj,
        won_projects=len(won_deals),
        lost_projects=len(lost_deals),
        open_deals=len(open_deals),
        pipeline_value_mad=pipeline_value,
        won_revenue_mad=won_revenue,
        conversion_rate=round(conv, 1),
        open_tasks=len(tasks),
        activities_30d=activities_30d,
    )

    return S.Account360(
        account=a, contacts=contacts, activities=activities,
        deals=deals, tasks=tasks, stats=stats,
    )


# ── Contacts ───────────────────────────────────────────────────────────────
@router.get("/contacts", response_model=list[S.ContactOut])
def list_all_contacts(
    account_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    query = db.query(CrmContact).filter(CrmContact.company_id == company_id, CrmContact.active == True)
    if account_id:
        query = query.filter(CrmContact.account_id == account_id)
    return query.order_by(CrmContact.is_primary.desc(), CrmContact.created_at.asc()).all()


@router.post("/contacts", response_model=S.ContactOut, status_code=201)
def create_contact_flat(
    data: S.ContactIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    account_id = data.account_id
    _account_or_404(db, company_id, account_id)
    payload = data.model_dump(exclude={"account_id"})
    row = CrmContact(company_id=company_id, account_id=account_id, **payload)
    db.add(row)
    db.flush()
    _log_activity(db, company_id=company_id, account_id=account_id,
                  type_="note", title=f"Contact ajouté: {row.first_name} {row.last_name or ''}".strip())
    db.commit()
    db.refresh(row)
    return row


@router.get("/accounts/{account_id}/contacts", response_model=list[S.ContactOut])
def list_contacts(
    account_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    return (
        db.query(CrmContact)
        .filter(CrmContact.company_id == company_id, CrmContact.account_id == account_id, CrmContact.active == True)
        .order_by(CrmContact.is_primary.desc(), CrmContact.created_at.asc())
        .all()
    )


@router.post("/accounts/{account_id}/contacts", response_model=S.ContactOut, status_code=201)
def create_contact(
    account_id: str,
    data: S.ContactIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    payload = data.model_dump(exclude={"account_id"})
    row = CrmContact(company_id=company_id, account_id=account_id, **payload)
    db.add(row)
    db.flush()
    _log_activity(db, company_id=company_id, account_id=account_id,
                  type_="note", title=f"Contact ajouté: {row.first_name} {row.last_name or ''}".strip())
    db.commit()
    db.refresh(row)
    return row


@router.patch("/contacts/{contact_id}", response_model=S.ContactOut)
def update_contact(
    contact_id: str,
    data: S.ContactUpdate,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmContact).filter(
        CrmContact.company_id == company_id, CrmContact.id == contact_id
    ).first()
    if not row:
        raise HTTPException(404, "Contact not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmContact).filter(
        CrmContact.company_id == company_id, CrmContact.id == contact_id
    ).first()
    if not row:
        raise HTTPException(404, "Contact not found")
    row.active = False
    db.commit()


# ── Activities ─────────────────────────────────────────────────────────────
@router.get("/accounts/{account_id}/activities", response_model=list[S.ActivityOut])
def list_activities(
    account_id: str,
    limit: int = Query(100, le=500),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    return (
        db.query(CrmActivity)
        .filter(CrmActivity.company_id == company_id, CrmActivity.account_id == account_id)
        .order_by(CrmActivity.occurred_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/accounts/{account_id}/activities", response_model=S.ActivityOut, status_code=201)
def create_activity(
    account_id: str,
    data: S.ActivityIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    payload = data.model_dump()
    if not payload.get("occurred_at"):
        payload["occurred_at"] = _now()
    row = CrmActivity(company_id=company_id, account_id=account_id, **payload)
    db.add(row)
    # update last_contact_at on the account
    a = _account_or_404(db, company_id, account_id)
    a.last_contact_at = row.occurred_at
    db.commit()
    db.refresh(row)
    return row


# ── Deals (pipeline) ───────────────────────────────────────────────────────
@router.post("/deals", response_model=S.DealOut, status_code=201)
def create_deal_flat(
    data: S.DealIn,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    account_id = data.account_id
    if not account_id:
        raise HTTPException(422, "account_id is required")
    _account_or_404(db, company_id, account_id)
    payload = data.model_dump(exclude={"account_id", "name"})
    payload["title"] = payload.get("title") or data.name
    if not payload["title"]:
        raise HTTPException(422, "title is required")
    row = CrmDeal(company_id=company_id, account_id=account_id, **payload)
    db.add(row)
    db.flush()
    _log_activity(db, company_id=company_id, account_id=account_id, deal_id=row.id,
                  type_="stage_change", title=f"Deal créé: {row.title} · {row.stage}")
    db.commit()
    db.refresh(row)
    output = S.DealOut.model_validate(row)
    output.name = output.title
    return output


@router.get("/deals", response_model=list[S.DealOut])
def list_deals(
    account_id: Optional[str] = None,
    stage: Optional[str] = None,
    owner_user_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    q = db.query(CrmDeal).filter(CrmDeal.company_id == company_id, CrmDeal.active == True)
    if account_id:
        q = q.filter(CrmDeal.account_id == account_id)
    if stage:
        q = q.filter(CrmDeal.stage == stage)
    if owner_user_id:
        q = q.filter(CrmDeal.owner_user_id == owner_user_id)
    return q.order_by(CrmDeal.expected_close_date.asc().nullslast() if hasattr(CrmDeal.expected_close_date.asc(), "nullslast") else CrmDeal.expected_close_date.asc()).all()


@router.post("/accounts/{account_id}/deals", response_model=S.DealOut, status_code=201)
def create_deal(
    account_id: str,
    data: S.DealIn,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    payload = data.model_dump(exclude={"account_id", "name"})
    payload["title"] = payload.get("title") or data.name
    if not payload["title"]:
        raise HTTPException(422, "title is required")
    row = CrmDeal(company_id=company_id, account_id=account_id, **payload)
    db.add(row)
    db.flush()
    _log_activity(db, company_id=company_id, account_id=account_id, deal_id=row.id,
                  type_="stage_change", title=f"Deal créé: {row.title} · {row.stage}")
    db.commit()
    db.refresh(row)
    output = S.DealOut.model_validate(row)
    output.name = output.title
    return output


@router.patch("/deals/{deal_id}", response_model=S.DealOut)
def update_deal(
    deal_id: str,
    data: S.DealUpdate,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.id == deal_id
    ).first()
    if not row:
        raise HTTPException(404, "Deal not found")
    old_stage = row.stage
    payload = data.model_dump(exclude_unset=True)
    for k, v in payload.items():
        setattr(row, k, v)
    if "stage" in payload and payload["stage"] != old_stage:
        if payload["stage"] in ("won", "lost"):
            row.closed_at = _now()
        _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.id,
                      type_="stage_change",
                      title=f"Étape changée: {old_stage} → {row.stage}")
    db.commit()
    db.refresh(row)
    return row


@router.post("/deals/{deal_id}/win", response_model=S.DealOut)
def win_deal(
    deal_id: str,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.id == deal_id
    ).first()
    if not row:
        raise HTTPException(404, "Deal not found")
    row.stage = "won"
    row.probability = 100
    row.closed_at = _now()
    _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.id,
                  type_="won", title=f"Deal gagné: {row.title}")
    db.commit()
    db.refresh(row)
    return row


@router.post("/deals/{deal_id}/lose", response_model=S.DealOut)
def lose_deal(
    deal_id: str,
    reason: Optional[str] = Query(None),
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.id == deal_id
    ).first()
    if not row:
        raise HTTPException(404, "Deal not found")
    row.stage = "lost"
    row.probability = 0
    row.closed_at = _now()
    row.lost_reason = reason
    _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.id,
                  type_="lost", title=f"Deal perdu: {row.title}", description=reason)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/deals/{deal_id}", status_code=204)
def delete_deal(
    deal_id: str,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.id == deal_id
    ).first()
    if not row:
        raise HTTPException(404, "Deal not found")
    row.active = False
    db.commit()


# ── Pipeline Kanban ────────────────────────────────────────────────────────
@router.get("/pipeline", response_model=S.PipelineView)
def pipeline_view(
    owner_user_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    q = db.query(CrmDeal).filter(CrmDeal.company_id == company_id, CrmDeal.active == True)
    if owner_user_id:
        q = q.filter(CrmDeal.owner_user_id == owner_user_id)
    deals = q.all()

    columns: list[S.PipelineColumn] = []
    total_pipeline = 0.0
    weighted = 0.0
    for stage, label in PIPELINE_STAGES:
        col_deals = [d for d in deals if d.stage == stage]
        amount = float(sum(float(d.amount_mad or 0) for d in col_deals))
        if stage in OPEN_STAGES:
            total_pipeline += amount
            weighted += sum(float(d.amount_mad or 0) * (d.probability or 0) / 100.0 for d in col_deals)
        columns.append(S.PipelineColumn(
            stage=stage, label=label,
            deals=col_deals, total_amount_mad=amount, count=len(col_deals),
        ))
    return S.PipelineView(
        columns=columns,
        total_pipeline_mad=round(total_pipeline, 2),
        weighted_pipeline_mad=round(weighted, 2),
    )


@router.get("/pipeline/dmc")
def pipeline_dmc_legacy_view(
    owner_user_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    return pipeline_dmc_view(owner_user_id=owner_user_id, company_id=company_id, db=db)


# ── Tasks ──────────────────────────────────────────────────────────────────
@router.get("/tasks", response_model=list[S.TaskOut])
def list_tasks(
    completed: Optional[bool] = None,
    owner_user_id: Optional[str] = None,
    overdue: Optional[bool] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    q = db.query(CrmTask).filter(CrmTask.company_id == company_id, CrmTask.active == True)
    if completed is True:
        q = q.filter(CrmTask.completed_at.isnot(None))
    elif completed is False:
        q = q.filter(CrmTask.completed_at.is_(None))
    if owner_user_id:
        q = q.filter(CrmTask.owner_user_id == owner_user_id)
    if overdue:
        q = q.filter(CrmTask.completed_at.is_(None), CrmTask.due_date < _now())
    return q.order_by(CrmTask.due_date.asc()).all()


@router.post("/tasks", response_model=S.TaskOut, status_code=201)
def create_task(
    data: S.TaskIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    if data.account_id:
        _account_or_404(db, company_id, data.account_id)
    row = CrmTask(company_id=company_id, **data.model_dump())
    db.add(row)
    db.flush()
    if row.account_id:
        _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.deal_id,
                      type_="note", title=f"Tâche: {row.title}")
    db.commit()
    db.refresh(row)
    return row


@router.patch("/tasks/{task_id}", response_model=S.TaskOut)
def update_task(
    task_id: str,
    data: S.TaskUpdate,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmTask).filter(
        CrmTask.company_id == company_id, CrmTask.id == task_id
    ).first()
    if not row:
        raise HTTPException(404, "Task not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.post("/tasks/{task_id}/complete", response_model=S.TaskOut)
def complete_task(
    task_id: str,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmTask).filter(
        CrmTask.company_id == company_id, CrmTask.id == task_id
    ).first()
    if not row:
        raise HTTPException(404, "Task not found")
    row.completed_at = _now()
    if row.account_id:
        _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.deal_id,
                      type_="task_done", title=f"Tâche terminée: {row.title}")
    db.commit()
    db.refresh(row)
    return row


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(
    task_id: str,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmTask).filter(
        CrmTask.company_id == company_id, CrmTask.id == task_id
    ).first()
    if not row:
        raise HTTPException(404, "Task not found")
    row.active = False
    db.commit()


# ── Dashboard ──────────────────────────────────────────────────────────────
@router.get("/dashboard", response_model=S.CrmDashboard)
def crm_dashboard(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    now = _now()
    cutoff_30 = now - timedelta(days=30)
    in_7 = now + timedelta(days=7)

    accounts = (
        db.query(CrmAccount)
        .filter(CrmAccount.company_id == company_id, CrmAccount.active == True)
        .all()
    )
    deals = (
        db.query(CrmDeal)
        .filter(CrmDeal.company_id == company_id, CrmDeal.active == True)
        .all()
    )
    tasks = (
        db.query(CrmTask)
        .filter(CrmTask.company_id == company_id, CrmTask.active == True,
                CrmTask.completed_at.is_(None))
        .all()
    )

    open_deals = [d for d in deals if d.stage in OPEN_STAGES]
    won_30d = [d for d in deals if d.stage == "won" and d.closed_at and d.closed_at >= cutoff_30]
    lost_30d = [d for d in deals if d.stage == "lost" and d.closed_at and d.closed_at >= cutoff_30]

    by_tier: dict[str, int] = {}
    by_lc: dict[str, int] = {}
    for a in accounts:
        by_tier[a.tier or "bronze"] = by_tier.get(a.tier or "bronze", 0) + 1
        by_lc[a.lifecycle_stage or "prospect"] = by_lc.get(a.lifecycle_stage or "prospect", 0) + 1

    open_pipeline = float(sum(float(d.amount_mad or 0) for d in open_deals))
    weighted = float(sum(float(d.amount_mad or 0) * (d.probability or 0) / 100.0 for d in open_deals))
    won_amount = float(sum(float(d.amount_mad or 0) for d in won_30d))
    avg_deal = (won_amount / len(won_30d)) if won_30d else 0.0
    overdue = sum(1 for t in tasks if t.due_date and t.due_date < now)
    upcoming = sum(1 for t in tasks if t.due_date and now <= t.due_date <= in_7)

    return S.CrmDashboard(
        total_accounts=len(accounts),
        new_accounts_30d=sum(1 for a in accounts if a.created_at and a.created_at >= cutoff_30),
        accounts_by_tier=by_tier,
        accounts_by_lifecycle=by_lc,
        open_deals_count=len(open_deals),
        open_pipeline_mad=round(open_pipeline, 2),
        weighted_pipeline_mad=round(weighted, 2),
        won_30d_count=len(won_30d),
        won_30d_mad=round(won_amount, 2),
        lost_30d_count=len(lost_30d),
        avg_deal_size_mad=round(avg_deal, 2),
        overdue_tasks=overdue,
        upcoming_tasks_7d=upcoming,
    )


# ── Deals — move-stage (DMC 10-stage pipeline) ────────────────────────────
@router.post("/deals/{deal_id}/move-stage", response_model=S.DealOut)
def move_deal_stage(
    deal_id: str,
    data: S.MoveStageIn,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.id == deal_id
    ).first()
    if not row:
        raise HTTPException(404, "Deal not found")
    old_stage = row.dmc_stage or row.stage
    row.dmc_stage = data.stage
    # Update stage history
    history = list(row.stage_history or [])
    history.append({
        "stage": data.stage,
        "entered_at": _now().isoformat(),
        "notes": data.notes,
    })
    row.stage_history = history
    row.entered_stage_at = _now()
    _log_activity(db, company_id=company_id, account_id=row.account_id, deal_id=row.id,
                  type_="stage_change",
                  title=f"Étape DMC: {old_stage} → {data.stage}",
                  description=data.notes)
    db.commit()
    db.refresh(row)
    return row


# ── Pipeline DMC ───────────────────────────────────────────────────────────
DMC_STAGES = [
    ("brief_received",      "Brief Reçu"),
    ("brief_qualified",     "Brief Qualifié"),
    ("quote_v1_sent",       "Offre V1 Envoyée"),
    ("follow_up_j2",        "Relance J+2"),
    ("follow_up_j5",        "Relance J+5"),
    ("quote_v2_sent",       "Offre V2 Envoyée"),
    ("decision_pending",    "Décision en cours"),
    ("deposit_received",    "Acompte reçu"),
    ("ops_in_progress",     "Opérations"),
    ("completed_nps_sent",  "Terminé / NPS"),
]


@router.get("/pipeline-dmc")
def pipeline_dmc_view(
    owner_user_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    q = db.query(CrmDeal).filter(CrmDeal.company_id == company_id, CrmDeal.active == True)
    if owner_user_id:
        q = q.filter(CrmDeal.owner_user_id == owner_user_id)
    deals = q.all()

    columns = []
    for stage, label in DMC_STAGES:
        col_deals = [d for d in deals if (d.dmc_stage or "") == stage]
        amount = float(sum(float(d.amount_mad or 0) for d in col_deals))
        columns.append({
            "stage": stage, "label": label,
            "deals": [S.DealOut.model_validate(d) for d in col_deals],
            "total_amount_mad": amount, "count": len(col_deals),
        })
    return {
        "columns": columns,
        "total_pipeline_mad": round(sum(c["total_amount_mad"] for c in columns), 2),
    }


@router.get("/pipeline-dmc/conversion")
def pipeline_dmc_conversion(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Conversion rate for each stage transition."""
    deals = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.active == True
    ).all()

    stage_counts: dict[str, int] = {}
    for stage, _ in DMC_STAGES:
        stage_counts[stage] = sum(1 for d in deals if (d.dmc_stage or "") == stage)

    # Conversion: each stage / first stage count
    first_count = stage_counts.get("brief_received", 1) or 1
    return [
        {
            "stage": stage,
            "label": label,
            "count": stage_counts.get(stage, 0),
            "conversion_pct": round(stage_counts.get(stage, 0) / first_count * 100, 1),
        }
        for stage, label in DMC_STAGES
    ]


@router.get("/pipeline-dmc/time-in-stage")
def pipeline_dmc_time_in_stage(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Average days each deal spends per stage based on stage_history."""
    deals = db.query(CrmDeal).filter(
        CrmDeal.company_id == company_id, CrmDeal.active == True,
        CrmDeal.stage_history.isnot(None),
    ).all()

    stage_durations: dict[str, list[float]] = {s: [] for s, _ in DMC_STAGES}
    for deal in deals:
        history = deal.stage_history or []
        for i, entry in enumerate(history[:-1]):
            stage = entry.get("stage")
            if stage not in stage_durations:
                continue
            try:
                entered = datetime.fromisoformat(entry["entered_at"])
                exited = datetime.fromisoformat(history[i + 1]["entered_at"])
                days = (exited - entered).total_seconds() / 86400
                stage_durations[stage].append(days)
            except (KeyError, ValueError):
                pass

    return [
        {
            "stage": stage,
            "label": label,
            "avg_days": round(
                sum(stage_durations[stage]) / len(stage_durations[stage]), 1
            ) if stage_durations[stage] else None,
            "samples": len(stage_durations[stage]),
        }
        for stage, label in DMC_STAGES
    ]


# ── Scoring ────────────────────────────────────────────────────────────────
@router.post("/accounts/{account_id}/recompute", response_model=S.AccountOut)
def recompute_account(
    account_id: str,
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    _account_or_404(db, company_id, account_id)
    from app.modules.crm.scoring import recompute_account_metrics
    return recompute_account_metrics(account_id, db)


@router.post("/recompute-all")
def recompute_all(
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.scoring import recompute_all_accounts
    count = recompute_all_accounts(db, company_id)
    return {"recomputed": count}


@router.get("/segments")
def get_segments(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    accounts = db.query(CrmAccount).filter(
        CrmAccount.company_id == company_id, CrmAccount.active == True
    ).all()
    segments: dict[str, int] = {}
    for a in accounts:
        seg = a.rfm_segment or "new"
        segments[seg] = segments.get(seg, 0) + 1
    return segments


# ── Leads ──────────────────────────────────────────────────────────────────
@router.post("/leads", response_model=S.LeadOut, status_code=201)
def create_lead(
    data: S.LeadIn,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    payload = data.model_dump()
    payload["extracted_email"] = payload.get("extracted_email") or payload.get("email")
    payload["extracted_phone"] = payload.get("extracted_phone") or payload.get("phone")
    payload["extracted_pax"] = payload.get("extracted_pax") or payload.get("pax_count")
    if payload.get("budget_max") is not None:
        payload["extracted_budget"] = payload.get("extracted_budget") or payload.get("budget_max")
    elif payload.get("budget_min") is not None:
        payload["extracted_budget"] = payload.get("extracted_budget") or payload.get("budget_min")
    if payload.get("destination"):
        payload["extracted_destinations"] = payload.get("extracted_destinations") or [payload["destination"]]
    if not payload.get("subject"):
        name = " ".join(part for part in (payload.get("first_name"), payload.get("last_name")) if part)
        payload["subject"] = name or payload.get("email") or "Lead CRM"
    row = _ingest_lead(payload, payload["source"], company_id, db)
    output = S.LeadOut.model_validate(row)
    output.email = row.extracted_email
    return output


@router.get("/reporting")
def reporting_overview(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    return {
        "dashboard": crm_dashboard(company_id=company_id, db=db).model_dump(),
        "segments": get_segments(company_id=company_id, db=db),
    }


@router.post("/scoring/recompute")
def scoring_recompute(
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    return recompute_all(_rbac=_rbac, company_id=company_id, db=db)


@router.get("/leads", response_model=list[S.LeadOut])
def list_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    score_min: Optional[int] = None,
    score_max: Optional[int] = None,
    assigned_to: Optional[str] = None,
    limit: int = Query(200, le=1000),
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    q = db.query(CrmLead).filter(CrmLead.company_id == company_id)
    if status:
        q = q.filter(CrmLead.status == status)
    if source:
        q = q.filter(CrmLead.source == source)
    if score_min is not None:
        q = q.filter(CrmLead.score >= score_min)
    if score_max is not None:
        q = q.filter(CrmLead.score <= score_max)
    if assigned_to:
        q = q.filter(CrmLead.assigned_to_user_id == assigned_to)
    return q.order_by(CrmLead.score.desc(), CrmLead.received_at.desc()).limit(limit).all()


@router.get("/leads/{lead_id}", response_model=S.LeadOut)
def get_lead(
    lead_id: str,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmLead).filter(
        CrmLead.company_id == company_id, CrmLead.id == lead_id
    ).first()
    if not row:
        raise HTTPException(404, "Lead not found")
    return row


def _ingest_lead(payload: dict, source: str, company_id: str, db: Session) -> CrmLead:
    """Common lead creation from parsed payload."""
    from app.modules.crm.lead_scoring import score_lead, assign_owner
    score, breakdown = score_lead({**payload, "source": source}, db=db)
    owner_id = assign_owner({**payload, "source": source}, db, company_id)
    import uuid as _uuid
    row = CrmLead(
        id=str(_uuid.uuid4()),
        company_id=company_id,
        source=source,
        subject=payload.get("subject"),
        body=payload.get("body"),
        raw_payload=payload,
        extracted_email=payload.get("extracted_email"),
        extracted_phone=payload.get("extracted_phone"),
        extracted_country=payload.get("extracted_country"),
        extracted_pax=payload.get("extracted_pax"),
        extracted_budget=payload.get("extracted_budget"),
        extracted_dates=payload.get("extracted_dates"),
        extracted_destinations=payload.get("extracted_destinations"),
        extracted_niche=payload.get("extracted_niche"),
        extracted_language=payload.get("extracted_language"),
        score=score,
        score_breakdown=breakdown,
        status="new",
        assigned_to_user_id=owner_id,
        received_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.post("/leads/ingest/email", response_model=S.LeadOut, status_code=201)
def ingest_email(
    payload: dict,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_intake import parse_email
    parsed = parse_email(payload)
    return _ingest_lead(parsed, "email", company_id, db)


@router.post("/leads/ingest/webform", response_model=S.LeadOut, status_code=201)
def ingest_webform(
    payload: dict,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_intake import parse_webform
    parsed = parse_webform(payload)
    return _ingest_lead(parsed, "webform", company_id, db)


@router.post("/leads/ingest/whatsapp", response_model=S.LeadOut, status_code=201)
def ingest_whatsapp(
    payload: dict,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_intake import parse_whatsapp
    parsed = parse_whatsapp(payload)
    return _ingest_lead(parsed, "whatsapp", company_id, db)


@router.post("/leads/ingest/instagram", response_model=S.LeadOut, status_code=201)
def ingest_instagram(
    payload: dict,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_intake import parse_instagram_dm
    parsed = parse_instagram_dm(payload)
    return _ingest_lead(parsed, "instagram", company_id, db)


@router.post("/leads/ingest/portal-b2b", response_model=S.LeadOut, status_code=201)
def ingest_portal_b2b(
    payload: dict,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_intake import parse_portal_b2b
    parsed = parse_portal_b2b(payload)
    return _ingest_lead(parsed, "portal_b2b", company_id, db)


@router.post("/leads/{lead_id}/qualify", response_model=S.LeadOut)
def qualify_lead(
    lead_id: str,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmLead).filter(
        CrmLead.company_id == company_id, CrmLead.id == lead_id
    ).first()
    if not row:
        raise HTTPException(404, "Lead not found")
    if row.status not in ("new",):
        raise HTTPException(400, f"Cannot qualify lead with status '{row.status}'")
    row.status = "qualified"
    row.qualified_at = _now()
    db.commit()
    db.refresh(row)
    return row


@router.post("/leads/{lead_id}/convert")
def convert_lead(
    lead_id: str,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    """Convert a qualified lead into an Account + Deal."""
    import uuid as _uuid
    row = db.query(CrmLead).filter(
        CrmLead.company_id == company_id, CrmLead.id == lead_id
    ).first()
    if not row:
        raise HTTPException(404, "Lead not found")
    if row.status not in ("new", "qualified"):
        raise HTTPException(400, f"Cannot convert lead with status '{row.status}'")

    # Create or find account
    account = None
    if row.extracted_email:
        account = db.query(CrmAccount).filter(
            CrmAccount.company_id == company_id,
            CrmAccount.primary_email == row.extracted_email,
            CrmAccount.active == True,
        ).first()

    if not account:
        account = CrmAccount(
            id=str(_uuid.uuid4()),
            company_id=company_id,
            name=row.extracted_email or f"Lead {row.id[:8]}",
            primary_email=row.extracted_email,
            primary_phone=row.extracted_phone,
            country=row.extracted_country,
            language=row.extracted_language,
            account_type="direct",
            tier="bronze",
            lifecycle_stage="prospect",
        )
        db.add(account)
        db.flush()
        _log_activity(db, company_id=company_id, account_id=account.id,
                      type_="note", title=f"Compte créé depuis lead {row.id[:8]}")

    # Create deal
    deal = CrmDeal(
        id=str(_uuid.uuid4()),
        company_id=company_id,
        account_id=account.id,
        title=row.subject or f"Deal lead {row.id[:8]}",
        stage="qualification",
        dmc_stage="brief_received",
        amount_mad=float(row.extracted_budget or 0),
        probability=20,
        pax=row.extracted_pax,
        destination=", ".join(row.extracted_destinations or []) or None,
        owner_user_id=row.assigned_to_user_id,
    )
    db.add(deal)
    db.flush()

    row.status = "converted"
    row.converted_at = _now()
    row.converted_account_id = account.id
    row.converted_deal_id = deal.id
    db.commit()
    db.refresh(account)
    db.refresh(deal)

    return {
        "account": S.AccountOut.model_validate(account),
        "deal": S.DealOut.model_validate(deal),
    }


@router.post("/leads/{lead_id}/reject", response_model=S.LeadOut)
def reject_lead(
    lead_id: str,
    body: dict,
    _rbac: dict = CRM_PIPELINE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmLead).filter(
        CrmLead.company_id == company_id, CrmLead.id == lead_id
    ).first()
    if not row:
        raise HTTPException(404, "Lead not found")
    row.status = "rejected"
    row.reject_reason = body.get("reason", "")
    db.commit()
    db.refresh(row)
    return row


@router.post("/leads/seed-demo")
def seed_demo_leads_endpoint(
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.lead_scoring import seed_demo_leads
    count = seed_demo_leads(db, company_id)
    return {"seeded": count}


# ── Reporting ──────────────────────────────────────────────────────────────
@router.get("/reporting/revenue-per-agent")
def reporting_revenue(
    period: str = Query("ytd"),
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import revenue_per_agent
    return revenue_per_agent(period, db, company_id)


@router.get("/reporting/conversion-by-market")
def reporting_markets(
    period: str = Query("ytd"),
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import conversion_by_market
    return conversion_by_market(period, db, company_id)


@router.get("/reporting/win-loss")
def reporting_win_loss(
    period: str = Query("ytd"),
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import win_loss_analysis
    return win_loss_analysis(period, db, company_id)


@router.get("/reporting/nps")
def reporting_nps(
    period: str = Query("ytd"),
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import nps_by_destination
    return nps_by_destination(period, db, company_id)


@router.get("/reporting/forecast")
def reporting_forecast(
    quarter: str = Query("Q2-2026"),
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import forecast_quarterly
    return forecast_quarterly(quarter, db, company_id)


@router.get("/reporting/churn")
def reporting_churn(
    _rbac: dict = CRM_REPORTING,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.reporting import churn_rate
    return churn_rate("ytd", db, company_id)


# ── Nurturing ──────────────────────────────────────────────────────────────
@router.get("/nurturing/sequences", response_model=list[S.NurturingSequenceOut])
def list_nurturing_sequences(
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    return db.query(CrmNurturingSequence).filter(
        CrmNurturingSequence.company_id == company_id
    ).order_by(CrmNurturingSequence.created_at.asc()).all()


@router.post("/nurturing/sequences/{sequence_id}/toggle", response_model=S.NurturingSequenceOut)
def toggle_nurturing_sequence(
    sequence_id: str,
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    row = db.query(CrmNurturingSequence).filter(
        CrmNurturingSequence.company_id == company_id,
        CrmNurturingSequence.id == sequence_id,
    ).first()
    if not row:
        raise HTTPException(404, "Sequence not found")
    row.is_active = not row.is_active
    db.commit()
    db.refresh(row)
    return row


@router.post("/nurturing/seed")
def seed_nurturing_sequences(
    _rbac: dict = CRM_WRITE,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    import uuid as _uuid
    from app.modules.crm.nurturing import PRE_SEEDED_SEQUENCES
    count = 0
    for seq_data in PRE_SEEDED_SEQUENCES:
        existing = db.query(CrmNurturingSequence).filter(
            CrmNurturingSequence.company_id == company_id,
            CrmNurturingSequence.name == seq_data["name"],
        ).first()
        if not existing:
            row = CrmNurturingSequence(
                id=str(_uuid.uuid4()),
                company_id=company_id,
                **seq_data,
            )
            db.add(row)
            count += 1
    db.commit()
    return {"seeded": count}


@router.get("/nurturing/runs", response_model=list[S.NurturingRunOut])
def list_nurturing_runs(
    account_id: Optional[str] = None,
    company_id: str = Depends(get_current_company_id),
    db: Session = Depends(get_db),
):
    from app.modules.crm.models import CrmNurturingRun
    # Filter by account via sequence + account relationship
    q = db.query(CrmNurturingRun).join(
        CrmNurturingSequence,
        CrmNurturingRun.sequence_id == CrmNurturingSequence.id,
    ).filter(CrmNurturingSequence.company_id == company_id)
    if account_id:
        q = q.filter(CrmNurturingRun.account_id == account_id)
    return q.order_by(CrmNurturingRun.started_at.desc()).limit(200).all()
