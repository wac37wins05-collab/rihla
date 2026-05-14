"""Invoice router — /api/invoices."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
import os

from app.core.database import get_db
from app.modules.invoices.models import Invoice
from app.modules.projects.models import Project
from app.modules.invoices.schemas import (
    InvoiceCreate, InvoiceUpdate,
    InvoiceResponse, InvoiceSummary,
)
from app.modules.invoices.service import InvoiceService
from app.shared.exceptions import NotFoundError
from app.shared.dependencies import require_auth, get_tenant_id

router = APIRouter(prefix="/invoices", tags=["invoices"], dependencies=[Depends(require_auth)])


# ── Tenant helpers ────────────────────────────────────────────────────────────

def _assert_invoice_tenant(invoice_id: str, company_id: str, db: Session) -> Invoice:
    """Load invoice and verify its parent project belongs to the caller's company."""
    row = db.execute(
        select(Invoice, Project.company_id)
        .join(Project, Project.id == Invoice.project_id)
        .where(Invoice.id == invoice_id, Invoice.active == True)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Facture introuvable.")
    invoice, proj_company_id = row
    if proj_company_id and proj_company_id != company_id:
        raise HTTPException(status_code=403, detail="Accès refusé à cette facture.")
    return invoice


def _assert_project_tenant(project_id: str, company_id: str, db: Session) -> None:
    project = db.execute(
        select(Project).where(Project.id == project_id, Project.active == True)
    ).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")
    if project.company_id and project.company_id != company_id:
        raise HTTPException(status_code=403, detail="Accès refusé à ce dossier.")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Créer une facture manuellement."""
    _assert_project_tenant(data.project_id, company_id, db)
    return InvoiceService(db).create(data)


@router.post("/from-project/{project_id}",
             response_model=InvoiceResponse, status_code=201)
def create_from_project(
    project_id: str,
    quotation_id: Optional[str] = None,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Générer automatiquement une facture depuis un projet confirmé."""
    _assert_project_tenant(project_id, company_id, db)
    return InvoiceService(db).create_from_project(project_id, quotation_id)


@router.get("/", response_model=list[InvoiceSummary])
def list_invoices(
    status: Optional[str] = None,
    limit:  int = Query(default=50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    # Filter via JOIN on projects so only the caller's invoices are returned
    q = (
        select(Invoice)
        .join(Project, Project.id == Invoice.project_id)
        .where(Invoice.active == True, Project.company_id == company_id)
    )
    if status:
        q = q.where(Invoice.status == status)
    q = q.order_by(Invoice.created_at.desc()).limit(limit).offset(offset)
    return db.execute(q).scalars().all()


@router.get("/project/{project_id}", response_model=list[InvoiceSummary])
def list_by_project(
    project_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_project_tenant(project_id, company_id, db)
    return InvoiceService(db).list_by_project(project_id)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_invoice_tenant(invoice_id, company_id, db)
    return InvoiceService(db).get(invoice_id)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: str,
    data: InvoiceUpdate,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_invoice_tenant(invoice_id, company_id, db)
    return InvoiceService(db).update(invoice_id, data)


@router.post("/{invoice_id}/generate-pdf")
def generate_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Générer le PDF de la facture (layout S'TOURS + logo RIHLA)."""
    _assert_invoice_tenant(invoice_id, company_id, db)
    path = InvoiceService(db).generate_pdf(invoice_id)
    if not os.path.exists(path):
        raise HTTPException(500, "Erreur génération PDF")
    inv = InvoiceService(db).get(invoice_id)
    safe = inv.number.replace("-", "_")
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=f"Facture_{safe}.pdf",
    )


@router.patch("/{invoice_id}/status")
def update_status(
    invoice_id: str,
    new_status: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    from app.modules.invoices.models import InvoiceStatus
    try:
        status = InvoiceStatus(new_status)
    except ValueError:
        raise HTTPException(400, f"Statut invalide: {new_status}")
    _assert_invoice_tenant(invoice_id, company_id, db)
    svc = InvoiceService(db)
    inv = svc.get(invoice_id)
    inv.status = status
    db.commit()
    return {"id": invoice_id, "status": status}


@router.get("/export/erp")
def export_erp(
    ids: list[str] = Query(...),
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    """Exporter les factures sélectionnées au format Sage (CSV) — tenant-scoped."""
    # Verify all requested invoices belong to the caller's company
    for invoice_id in ids:
        _assert_invoice_tenant(invoice_id, company_id, db)
    csv_data = InvoiceService(db).export_for_erp(ids)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=export_sage_rihla.csv"}
    )


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    company_id: str = Depends(get_tenant_id),
):
    _assert_invoice_tenant(invoice_id, company_id, db)
    InvoiceService(db).delete(invoice_id)
