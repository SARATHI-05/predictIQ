from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.database.database import get_db
from app.models.alert import Alert
from app.models.notification import Notification
from app.models.inventory import InventoryItem
from app.models.food_record import FoodRecord
from app.models.user import User
from app.schemas.alert import AlertCreate, AlertResponse
from app.utils.auth import get_current_user, require_admin
from app.utils.audit import log_audit_event

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

class DonateRequest(BaseModel):
    partner_name: str
    notes: Optional[str] = "Fresh surplus dispatched for NGO collection."

def _auto_evaluate_operational_alerts(db: Session):
    """
    Evaluates real-time inventory levels and food records to auto-publish operational alerts.
    """
    try:
        # 1. Low Inventory Stock Warnings
        low_stock_items = db.query(InventoryItem).filter(InventoryItem.current_stock < InventoryItem.min_stock_level).all()
        for item in low_stock_items:
            existing = db.query(Alert).filter(
                Alert.alert_type.ilike("%Shortage%"),
                Alert.message.ilike(f"%{item.ingredient_name}%"),
                Alert.is_read == False
            ).first()

            if not existing:
                alert_msg = f"Inventory Warning: {item.ingredient_name} stock ({item.current_stock}{item.unit}) is below minimum reorder threshold ({item.min_stock_level}{item.unit}). Supplier: {item.supplier or 'Standard Supplier'}."
                new_alert = Alert(
                    alert_type="Shortage",
                    message=alert_msg,
                    severity="High" if item.current_stock < (item.min_stock_level * 0.5) else "Medium",
                    is_read=False
                )
                db.add(new_alert)

                # Sync to Notification Center
                new_notif = Notification(
                    type="SHORTAGE",
                    title=f"Low Stock: {item.ingredient_name}",
                    message=alert_msg,
                    severity="High" if item.current_stock < (item.min_stock_level * 0.5) else "Medium",
                    is_read=False
                )
                db.add(new_notif)

        # 2. Food Surplus Warnings from recent Leftovers
        recent_leftover = db.query(FoodRecord).filter(FoodRecord.leftover >= 35).order_by(FoodRecord.id.desc()).first()
        if recent_leftover:
            existing_surplus = db.query(Alert).filter(
                Alert.alert_type.ilike("%Surplus%"),
                Alert.message.ilike(f"%{recent_leftover.food_category}%"),
                Alert.is_read == False
            ).first()

            if not existing_surplus:
                surplus_msg = f"Surplus Alert: ~{recent_leftover.leftover} excess meals detected for {recent_leftover.food_category}. Recommended NGO donation routing ready for pickup."
                new_surplus_alert = Alert(
                    alert_type="Surplus",
                    message=surplus_msg,
                    severity="High",
                    is_read=False
                )
                db.add(new_surplus_alert)

                # Sync to Notification Center
                new_surplus_notif = Notification(
                    type="SURPLUS",
                    title=f"Food Surplus Warning: {recent_leftover.food_category}",
                    message=surplus_msg,
                    severity="High",
                    is_read=False
                )
                db.add(new_surplus_notif)

        db.commit()
    except Exception as e:
        print(f"[Alert Evaluator Notice]: {e}")
        db.rollback()

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    alert_type: Optional[str] = None,
    severity: Optional[str] = None,
    unread_only: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all operational alerts with optional type, severity, and unread filtering.
    Automatically evaluates live inventory and leftover thresholds.
    """
    _auto_evaluate_operational_alerts(db)

    query = db.query(Alert)
    if alert_type and alert_type != "All":
        query = query.filter(Alert.alert_type.ilike(f"%{alert_type}%"))
    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)
    if unread_only:
        query = query.filter(Alert.is_read == False)
    return query.order_by(Alert.is_read.asc(), Alert.id.desc()).all()

@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    alert_in: AlertCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Publish a new operational alert and dispatch to Notification Center.
    """
    new_alert = Alert(
        alert_type=alert_in.alert_type,
        message=alert_in.message,
        severity=alert_in.severity,
        is_read=False
    )
    db.add(new_alert)

    # Also add to Notification Center
    notif_type = "SURPLUS" if "surplus" in alert_in.alert_type.lower() else ("SHORTAGE" if "shortage" in alert_in.alert_type.lower() else "SYSTEM")
    new_notif = Notification(
        type=notif_type,
        title=f"{alert_in.alert_type} Warning",
        message=alert_in.message,
        severity=alert_in.severity,
        is_read=False
    )
    db.add(new_notif)

    db.commit()
    db.refresh(new_alert)

    log_audit_event(
        db=db,
        action="ALERT_PUBLISHED",
        module="Alerts",
        description=f"Operational alert published: [{alert_in.alert_type}] {alert_in.message[:80]}...",
        user=current_user,
        record_id=str(new_alert.id),
        request=request
    )

    return new_alert

@router.put("/{alert_id}/read", response_model=AlertResponse)
def mark_alert_read(
    alert_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Acknowledge and mark an alert as resolved.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = True
    db.commit()
    db.refresh(alert)

    log_audit_event(
        db=db,
        action="ALERT_ACKNOWLEDGED",
        module="Alerts",
        description=f"Alert #{alert_id} acknowledged and marked as resolved by {current_user.email}",
        user=current_user,
        record_id=str(alert.id),
        request=request
    )

    return alert

@router.put("/{alert_id}/unread", response_model=AlertResponse)
def mark_alert_unread(
    alert_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Re-open an alert.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_read = False
    db.commit()
    db.refresh(alert)
    return alert

@router.post("/{alert_id}/donate")
def route_food_donation(
    alert_id: int,
    payload: DonateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dispatch food surplus donation to verified partner NGO.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True

    # Add notification entry for donation dispatch
    donation_notif = Notification(
        type="SURPLUS",
        title="Donation Pickup Dispatched",
        message=f"Food surplus donation pickup dispatched to {payload.partner_name}. Notes: {payload.notes}",
        severity="Low",
        is_read=False
    )
    db.add(donation_notif)
    db.commit()

    log_audit_event(
        db=db,
        action="DONATION_DISPATCHED",
        module="Alerts",
        description=f"Surplus food donation routed to partner '{payload.partner_name}' for Alert #{alert_id}",
        user=current_user,
        record_id=str(alert_id),
        request=request
    )

    return {
        "success": True,
        "message": f"Food donation pickup request successfully dispatched to {payload.partner_name}.",
        "alert": alert
    }

@router.delete("/{alert_id}", status_code=status.HTTP_200_OK)
def delete_alert(
    alert_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Dismiss and delete an alert record.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(alert)
    db.commit()

    log_audit_event(
        db=db,
        action="ALERT_DELETED",
        module="Alerts",
        description=f"Alert #{alert_id} dismissed and removed by {current_user.email}",
        user=current_user,
        record_id=str(alert_id),
        request=request
    )

    return {"message": f"Alert #{alert_id} deleted successfully", "success": True}

@router.post("/clear-read", status_code=status.HTTP_200_OK)
def clear_resolved_alerts(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin-only: Clear all resolved / acknowledged alerts.
    """
    deleted_count = db.query(Alert).filter(Alert.is_read == True).delete(synchronize_session=False)
    db.commit()

    log_audit_event(
        db=db,
        action="RESOLVED_ALERTS_CLEARED",
        module="Alerts",
        description=f"Cleared {deleted_count} resolved operational alerts from system",
        user=current_user,
        request=request
    )

    return {"message": f"Cleared {deleted_count} resolved alerts", "deleted_count": deleted_count, "success": True}
