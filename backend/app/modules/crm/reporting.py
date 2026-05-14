"""CRM Reporting — revenue, conversion, win/loss, NPS, churn, forecast."""
from __future__ import annotations
from datetime import datetime, timedelta, date
from typing import Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.modules.crm.models import CrmAccount, CrmDeal, CrmActivity


def _parse_period(period: str) -> tuple[datetime, datetime]:
    """Parse period string like 'Q1-2026', '2026-01', 'last30' → (start, end)."""
    now = datetime.utcnow()
    if period.startswith("Q"):
        try:
            q, yr = period.split("-")
            q_num = int(q[1])
            year = int(yr)
            q_start_month = (q_num - 1) * 3 + 1
            start = datetime(year, q_start_month, 1)
            end_month = q_start_month + 3
            if end_month > 12:
                end = datetime(year + 1, 1, 1)
            else:
                end = datetime(year, end_month, 1)
            return start, end
        except Exception:
            pass
    if period == "last30":
        return now - timedelta(days=30), now
    if period == "last90":
        return now - timedelta(days=90), now
    if period == "ytd":
        return datetime(now.year, 1, 1), now
    # Default: last 90 days
    return now - timedelta(days=90), now


def revenue_per_agent(period: str, db: Session, company_id: str) -> list[dict[str, Any]]:
    start, end = _parse_period(period)
    deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.stage == "won",
            CrmDeal.closed_at >= start,
            CrmDeal.closed_at < end,
            CrmDeal.active == True,
        )
        .all()
    )
    by_agent: dict[str, dict] = {}
    for d in deals:
        uid = d.owner_user_id or "unassigned"
        if uid not in by_agent:
            by_agent[uid] = {"owner_user_id": uid, "deals_won": 0, "revenue_mad": 0.0}
        by_agent[uid]["deals_won"] += 1
        by_agent[uid]["revenue_mad"] += float(d.amount_mad or 0)
    return sorted(by_agent.values(), key=lambda x: -x["revenue_mad"])


def conversion_by_market(period: str, db: Session, company_id: str) -> list[dict[str, Any]]:
    start, end = _parse_period(period)
    deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.created_at >= start,
            CrmDeal.created_at < end,
            CrmDeal.active == True,
        )
        .all()
    )
    # Join with account to get country
    accounts_map: dict[str, str] = {}
    accs = db.query(CrmAccount).filter(CrmAccount.company_id == company_id).all()
    for a in accs:
        accounts_map[a.id] = a.country or "Unknown"

    by_country: dict[str, dict] = {}
    for d in deals:
        country = accounts_map.get(d.account_id, "Unknown")
        if country not in by_country:
            by_country[country] = {"country": country, "total": 0, "won": 0, "lost": 0,
                                   "revenue_mad": 0.0, "conversion_rate": 0.0}
        by_country[country]["total"] += 1
        if d.stage == "won":
            by_country[country]["won"] += 1
            by_country[country]["revenue_mad"] += float(d.amount_mad or 0)
        elif d.stage == "lost":
            by_country[country]["lost"] += 1

    for row in by_country.values():
        row["conversion_rate"] = round(row["won"] / row["total"] * 100, 1) if row["total"] else 0.0
    return sorted(by_country.values(), key=lambda x: -x["revenue_mad"])


def win_loss_analysis(period: str, db: Session, company_id: str) -> dict[str, Any]:
    start, end = _parse_period(period)
    deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.closed_at >= start,
            CrmDeal.closed_at < end,
            CrmDeal.stage.in_(["won", "lost"]),
            CrmDeal.active == True,
        )
        .all()
    )
    won = [d for d in deals if d.stage == "won"]
    lost = [d for d in deals if d.stage == "lost"]
    total = len(deals)
    win_rate = round(len(won) / total * 100, 1) if total else 0.0

    lost_reasons: dict[str, int] = {}
    for d in lost:
        reason = d.lost_reason or "other"
        lost_reasons[reason] = lost_reasons.get(reason, 0) + 1

    return {
        "period": period,
        "total_closed": total,
        "won_count": len(won),
        "lost_count": len(lost),
        "win_rate": win_rate,
        "revenue_won_mad": sum(float(d.amount_mad or 0) for d in won),
        "lost_reasons": [{"reason": k, "count": v} for k, v in
                         sorted(lost_reasons.items(), key=lambda x: -x[1])],
    }


def nps_by_destination(period: str, db: Session, company_id: str) -> list[dict[str, Any]]:
    start, end = _parse_period(period)
    deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.stage == "won",
            CrmDeal.closed_at >= start,
            CrmDeal.closed_at < end,
            CrmDeal.active == True,
            CrmDeal.destination.isnot(None),
        )
        .all()
    )
    # Get NPS per account
    accounts_map = {a.id: a.nps_score for a in
                    db.query(CrmAccount).filter(CrmAccount.company_id == company_id).all()}

    by_dest: dict[str, dict] = {}
    for d in deals:
        dest = d.destination or "Unknown"
        nps = accounts_map.get(d.account_id)
        if dest not in by_dest:
            by_dest[dest] = {"destination": dest, "trips": 0, "nps_scores": []}
        by_dest[dest]["trips"] += 1
        if nps is not None:
            by_dest[dest]["nps_scores"].append(nps)

    result = []
    for dest, row in by_dest.items():
        scores = row["nps_scores"]
        result.append({
            "destination": dest,
            "trips": row["trips"],
            "nps_avg": round(sum(scores) / len(scores), 1) if scores else None,
        })
    return sorted(result, key=lambda x: -(x["nps_avg"] or -999))


def churn_rate(period: str, db: Session, company_id: str) -> dict[str, Any]:
    accounts = (
        db.query(CrmAccount)
        .filter(CrmAccount.company_id == company_id, CrmAccount.active == True)
        .all()
    )
    total = len(accounts)
    hibernating = sum(1 for a in accounts if (a.rfm_segment or "") == "hibernating")
    at_risk = sum(1 for a in accounts if (a.rfm_segment or "") == "at_risk")
    churn_pct = round(hibernating / total * 100, 1) if total else 0.0
    at_risk_pct = round(at_risk / total * 100, 1) if total else 0.0
    return {
        "total_accounts": total,
        "hibernating_count": hibernating,
        "at_risk_count": at_risk,
        "churn_rate_pct": churn_pct,
        "at_risk_pct": at_risk_pct,
    }


def forecast_quarterly(quarter: str, db: Session, company_id: str) -> dict[str, Any]:
    """Forecast CA based on open pipeline × probability."""
    open_stages = {"qualification", "proposal", "negotiation",
                   "brief_received", "brief_qualified", "quote_v1_sent",
                   "follow_up_j2", "follow_up_j5", "quote_v2_sent", "decision_pending"}
    deals = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.stage.in_(list(open_stages)),
            CrmDeal.active == True,
        )
        .all()
    )
    total_pipeline = sum(float(d.amount_mad or 0) for d in deals)
    weighted = sum(float(d.amount_mad or 0) * (d.probability or 0) / 100.0 for d in deals)

    start, end = _parse_period(quarter)
    won_in_period = (
        db.query(CrmDeal)
        .filter(
            CrmDeal.company_id == company_id,
            CrmDeal.stage == "won",
            CrmDeal.closed_at >= start,
            CrmDeal.closed_at < end,
            CrmDeal.active == True,
        )
        .all()
    )
    actual_mad = sum(float(d.amount_mad or 0) for d in won_in_period)

    return {
        "quarter": quarter,
        "open_deals_count": len(deals),
        "total_pipeline_mad": round(total_pipeline, 2),
        "weighted_forecast_mad": round(weighted, 2),
        "actual_won_mad": round(actual_mad, 2),
        "confidence_pct": round(weighted / total_pipeline * 100, 1) if total_pipeline else 0.0,
    }
