import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from dotenv import load_dotenv

def _dispatch_email(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """
    Internal delivery helper supporting dual-protocol delivery (Port 465 SSL & Port 587 TLS)
    with full UTF-8 encoding support.
    """
    load_dotenv(override=True)

    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    smtp_user = (os.getenv("SMTP_USER") or "predictiqfoodmanagement@gmail.com").strip()
    smtp_pass = (os.getenv("SMTP_PASSWORD") or "slfr ywbj lulq zzuy").strip().replace(" ", "")
    from_email = (os.getenv("EMAILS_FROM_EMAIL") or smtp_user).strip()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"PredictIQ Team <{from_email}>"
    msg["To"] = to_email

    # Explicitly attach as UTF-8 encoded text
    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Attempt 1: Direct SSL on Port 465 (Most reliable for cloud environments)
    try:
        ssl_ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, 465, context=ssl_ctx, timeout=12) as server:
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[Email Service SUCCESS] Email delivered to {to_email} via SSL 465!")
            return True
    except Exception as ssl_err:
        print(f"[Email Service NOTICE] SSL 465 failed: {ssl_err}. Trying STARTTLS 587...")

    # Attempt 2: STARTTLS on Port 587 (Fallback)
    try:
        with smtplib.SMTP(smtp_host, 587, timeout=12) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            print(f"[Email Service SUCCESS] Email delivered to {to_email} via STARTTLS 587!")
            return True
    except Exception as tls_err:
        print(f"[Email Service ERROR] Both SSL 465 and 587 failed for {to_email}: {tls_err}")

    return False


def send_verification_email(to_email: str, code: str) -> bool:
    """
    Sends a 6-digit verification code for password reset or identity verification.
    """
    subject = f"{code} is your PredictIQ verification code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 20px; }}
        .container {{ max-width: 500px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        .logo {{ font-size: 24px; font-weight: 800; color: #FFFFFF; margin-bottom: 20px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 14px; color: #94A3B8; margin-bottom: 24px; }}
        .code-box {{ background: #0B0F17; border: 1px dashed #10B981; border-radius: 12px; padding: 18px; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34D399; font-family: monospace; margin: 24px 0; }}
        .note {{ font-size: 13px; color: #64748B; line-height: 1.5; margin-top: 24px; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #475569; border-top: 1px solid #1E293B; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Predict<span class="accent">IQ</span></div>
        <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        <p style="font-size: 15px; color: #F1F5F9; margin-bottom: 12px;">You requested a password reset verification code.</p>
        <p style="font-size: 14px; color: #94A3B8;">Enter this 6-digit code on the verification screen to proceed:</p>
        
        <div class="code-box">{code}</div>
        
        <p class="note">This verification code is valid for <strong>15 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
        <div class="footer">PredictIQ Automated Security Notification</div>
      </div>
    </body>
    </html>
    """

    text_content = f"""PredictIQ Password Reset Verification
    
Your 6-digit verification code is: {code}

This code expires in 15 minutes. If you did not request this password reset, please ignore this email.
"""

    return _dispatch_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)


def send_welcome_email(to_email: str, user_name: str, role: str = "Staff") -> bool:
    """
    Sends a personalized Welcome Email to newly registered users.
    """
    display_name = user_name or to_email.split('@')[0].capitalize()
    role_title = "System Administrator" if role.lower() == "admin" else "Kitchen Staff"
    subject = f"Welcome to PredictIQ, {display_name}! 🚀"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 20px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 30px; text-align: left; box-shadow: 0 12px 35px rgba(0,0,0,0.55); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-top: 4px; }}
        .greeting {{ font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px; }}
        .role-badge {{ display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34D399; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin: 8px 0 16px; text-transform: uppercase; letter-spacing: 0.5px; }}
        .card {{ background: #0B0F17; border: 1px solid #1E293B; border-radius: 12px; padding: 18px; margin: 18px 0; }}
        .feature-item {{ margin: 8px 0; font-size: 14px; color: #CBD5E1; display: flex; align-items: center; }}
        .btn {{ display: block; background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: #FFFFFF; font-weight: 700; font-size: 15px; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 10px; margin: 24px 0 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }}
        .footer {{ text-align: center; margin-top: 28px; font-size: 12px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Predict<span class="accent">IQ</span></div>
          <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        </div>

        <div class="greeting">Welcome aboard, {display_name}! 👋</div>
        <p style="font-size: 14px; color: #94A3B8; line-height: 1.6; margin: 0;">
          Your PredictIQ account is ready. You have been registered with the role designation:
        </p>

        <div class="role-badge">{role_title}</div>

        <div class="card">
          <div style="font-size: 13px; font-weight: 700; color: #F1F5F9; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">What you can do with PredictIQ:</div>
          <div class="feature-item">📊 <strong>Demand Forecasts:</strong> AI predictions for daily meal preparation</div>
          <div class="feature-item">🍲 <strong>Food Logs:</strong> Track meal consumption & minimize leftovers</div>
          <div class="feature-item">📦 <strong>Inventory:</strong> Real-time pantry stock & procurement triggers</div>
          <div class="feature-item">📈 <strong>Analytics:</strong> Wastage trends & instant compliance export</div>
        </div>

        <a href="https://predict-iq-seven.vercel.app/dashboard" class="btn">
          🚀 Open PredictIQ Dashboard
        </a>

        <div class="footer">
          PredictIQ Cloud • Automated Account Notification<br/>
          If you have any questions, reply directly to this email for support.
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""Welcome to PredictIQ, {display_name}!

Your account is now active with the role: {role_title}.

Key Features:
- Daily AI Demand Forecasting
- Meal Consumption & Food Log Tracking
- Inventory Management & Purchase Suggestions
- Wastage Analytics & Compliance Reports

Open your dashboard: https://predict-iq-seven.vercel.app/dashboard

PredictIQ Cloud Team
"""

    return _dispatch_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)
