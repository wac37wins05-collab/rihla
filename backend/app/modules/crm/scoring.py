"""CRM Scoring — Account 360° computed metrics & RFM segmentation.

Called:
  - manually via POST /api/crm/accounts/{id}/recompute
  - in bulk  via POST /api/crm/recompute-all  (admin/cron)
"""
from __future__ import annotations
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.modules.crm.models import CrmAccount, CrmDeal, CrmActivity


# ── RFM thresholds (DMC-tourism calibrated) ──────────────────────────────────

def _days_since(dt: Optional[date | datetime]) -> Optional[int]:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        dt = dt.date()
    return (date.today() - dt).days


def recompute_rfm_segment(account: CrmAccount, db: Session) -> str:
    """Classify an account into one of 6 RFM segments."""
    trips_count = account.trips_count or 0
    last_trip_days = _days_since(account.last_trip_at)
    ca = float(account.ca_cumul or 0)

    # Champion: active < 6 months + ≥3 trips + CA > 50K€
    if (
        last_trip_days is not None and last_trip_days < 180
        and trips_count >= 3
        and ca > 50_000
    ):
        return "champion"

    # Loyal: active < 12 months + ≥2 trips
    if (
        last_trip_days is not None and last_trip_days < 365
        and trips_count >= 2
    ):
        return "loyal"

    # Promising: 1 recent trip < 6 months OR ≥3 quotes with 1 won deal
    won_deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.account_id == account.id,
            CrmDeal.active == True,
            CrmDeal.stage == "won",
        )
        .count()
    )
    total_deals = (
        db.query(CrmDeal)
        .filter(CrmDeal.account_id == account.id, CrmDeal.active == True)
        .count()
    )
    if (
        (last_trip_days is not None and last_trip_days < 180 and trips_count >= 1)
        or (total_deals >= 3 and won_deals >= 1)
    ):
        return "promising"

    # At Risk: last trip 12-24 months + ≥2 trips (was loyal, drifting)
    if (
        last_trip_days is not None
        and 365 <= last_trip_days <= 730
        and trips_count >= 2
    ):
        return "at_risk"

    # Hibernating: last trip > 24 months OR 0 trips + 0 contact > 6 months
    if last_trip_days is not None and last_trip_days > 730:
        return "hibernating"

    last_activity = (
        db.query(CrmActivity)
        .filter(CrmActivity.account_id == account.id)
        .order_by(CrmActivity.occurred_at.desc())
        .first()
    )
    if last_activity is None:
        # Created < 90 days → New
        created_days = _days_since(
            account.created_at.date() if isinstance(account.created_at, datetime) else account.created_at
        )
        if created_days is not None and created_days < 90:
            return "new"
        return "hibernating"

    last_contact_days = _days_since(
        last_activity.occurred_at.date()
        if isinstance(last_activity.occurred_at, datetime)
        else last_activity.occurred_at
    )
    if trips_count == 0 and (last_contact_days is None or last_contact_days > 180):
        return "hibernating"

    # Default → New (created < 90 days)
    created_days = _days_since(
        account.created_at.date() if isinstance(account.created_at, datetime) else account.created_at
    )
    if created_days is not None and created_days < 90:
        return "new"

    return "hibernating"


def recompute_account_metrics(account_id: str, db: Session) -> CrmAccount:
    """Recompute all computed columns for a single account."""
    from datetime import timezone
    account = db.query(CrmAccount).filter(CrmAccount.id == account_id).first()
    if not account:
        raise ValueError(f"Account {account_id} not found")

    deals = (
        db.query(CrmDeal)
        .filter(CrmDeal.account_id == account_id, CrmDeal.active == True)
        .all()
    )

    won_deals = [d for d in deals if d.stage == "won"]
    trips_count = len(won_deals)

    ca_cumul = sum(float(d.amount_mad or 0) for d in won_deals)
    lifetime_value = ca_cumul  # simplified: LTV = CA cumul for now

    # NPS average (from nps_score field on account — kept simple)
    nps_avg = float(account.nps_score) if account.nps_score is not None else None

    # Last trip date: latest closed_at among won deals
    closed_dates = [d.closed_at for d in won_deals if d.closed_at]
    last_trip_at = max(closed_dates).date() if closed_dates else None

    # Top 3 destinations
    dest_counts: dict[str, int] = {}
    for d in won_deals:
        if d.destination:
            dest_counts[d.destination] = dest_counts.get(d.destination, 0) + 1
    top_destinations = sorted(dest_counts, key=lambda k: -dest_counts[k])[:3]

    # Pax cumul
    pax_cumul = sum(d.pax or 0 for d in won_deals)

    # Margin avg % — stored in deal description as "margin:XX" if present
    margins = []
    for d in won_deals:
        if d.description and "margin:" in d.description:
            try:
                m = float(d.description.split("margin:")[1].split()[0])
                margins.append(m)
            except Exception:
                pass
    margin_avg_pct = (sum(margins) / len(margins)) if margins else None

    # Update model
    account.pax_cumul = pax_cumul
    account.ca_cumul = ca_cumul
    account.trips_count = trips_count
    account.last_trip_at = last_trip_at
    account.nps_avg = nps_avg
    account.lifetime_value = lifetime_value
    account.top_destinations = top_destinations
    account.margin_avg_pct = margin_avg_pct
    account.last_recompute_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # RFM segment (after setting computed fields)
    account.rfm_segment = recompute_rfm_segment(account, db)

    # RFM score string (simplified 3-digit: R F M each 1-5)
    r_score = _r_score(last_trip_at)
    f_score = _f_score(trips_count)
    m_score = _m_score(ca_cumul)
    account.rfm_score = f"{r_score}{f_score}{m_score}"

    db.commit()
    db.refresh(account)
    return account


def recompute_all_accounts(db: Session, company_id: str) -> int:
    """Recompute metrics for all active accounts in a company. Returns count."""
    accounts = (
        db.query(CrmAccount)
        .filter(CrmAccount.company_id == company_id, CrmAccount.active == True)
        .all()
    )
    count = 0
    for acc in accounts:
        try:
            recompute_account_metrics(acc.id, db)
            count += 1
        except Exception:
            pass  # skip failed accounts, continue
    return count


# ── RFM helper scorers (1=lowest, 5=highest) ─────────────────────────────────

def _r_score(last_trip_at: Optional[date]) -> int:
    """Recency score: more recent = higher."""
    if last_trip_at is None:
        return 1
    days = (date.today() - last_trip_at).days
    if days < 90:   return 5
    if days < 180:  return 4
    if days < 365:  return 3
    if days < 730:  return 2
    return 1


def _f_score(trips_count: int) -> int:
    """Frequency score."""
    if trips_count >= 10: return 5
    if trips_count >= 5:  return 4
    if trips_count >= 3:  return 3
    if trips_count >= 1:  return 2
    return 1


def _m_score(ca_cumul: float) -> int:
    """Monetary score (in EUR-equivalent, ~10 MAD per EUR)."""
    if ca_cumul >= 500_000: return 5
    if ca_cumul >= 200_000: return 4
    if ca_cumul >= 100_000: return 3
    if ca_cumul >= 30_000:  return 2
    return 1
