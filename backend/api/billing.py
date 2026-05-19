from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
import stripe
import os

from db.session import get_db
from models.core_models import User, Tenant, TenantMember
from api.deps import get_current_user
from core.config import settings
from fastapi import Request

stripe.api_key = settings.STRIPE_SECRET_KEY
router = APIRouter()

@router.post("/create-checkout-session")
def create_checkout_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Ensure the user is an owner/admin of their workspace
    membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not membership or membership.role.value not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only workspace owners can manage billing.")

    tenant = db.query(Tenant).filter(Tenant.id == membership.tenant_id).first()

    try:
        # 2. Create the Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': settings.STRIPE_PRO_PRICE_ID,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/settings?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/settings?canceled=true",
            customer_email=current_user.email,
            
            # CRITICAL: We pass the Tenant ID in the metadata so the webhook knows who paid!
            metadata={
                "tenant_id": tenant.id
            }
        )
        # Return the Stripe-hosted URL to the frontend
        return {"url": checkout_session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    # 1. Get the raw body and Stripe signature
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET

    try:
        # 2. Verify the webhook came securely from Stripe
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Handle successful checkout
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Grab the tenant_id we passed in during the checkout creation
        tenant_id = session['metadata'].get('tenant_id')
        customer_id = session.get('customer')

        if tenant_id:
            # Unlock the Pro Tier!
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if tenant:
                tenant.stripe_customer_id = customer_id
                tenant.subscription_status = 'active'
                tenant.subscription_plan = 'pro'
                db.commit()
                print(f"✅ SUCCESS: Workspace {tenant.name} upgraded to PRO!")

    return {"status": "success"}