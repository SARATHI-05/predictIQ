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
    Sends a personalized Welcome Email to newly registered users with official PredictIQ template.
    """
    display_name = user_name.strip() if user_name else to_email.split('@')[0].capitalize()
    subject = "Welcome to PredictIQ – AI-Based Food Demand and Resource Planning System"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 20px; line-height: 1.6; }}
        .container {{ max-width: 540px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 32px; box-shadow: 0 12px 35px rgba(0,0,0,0.55); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-top: 4px; }}
        .content {{ font-size: 15px; color: #E2E8F0; }}
        .content p {{ margin: 16px 0; }}
        .highlight-card {{ background: #0B0F17; border-left: 3px solid #10B981; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #CBD5E1; }}
        .btn {{ display: block; background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: #FFFFFF; font-weight: 700; font-size: 15px; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 10px; margin: 24px 0 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); }}
        .footer {{ margin-top: 28px; font-size: 13px; color: #94A3B8; border-top: 1px solid #1E293B; padding-top: 20px; }}
        .footer-title {{ font-weight: 700; color: #F1F5F9; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Predict<span class="accent">IQ</span></div>
          <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        </div>

        <div class="content">
          <p style="font-size: 16px; font-weight: 600; color: #FFFFFF; margin-top: 0;">Hello {display_name},</p>
          
          <p>Welcome to <strong>PredictIQ – AI-Based Food Demand and Resource Planning System</strong>!</p>
          
          <p>Your account has been successfully created using this email address. We're excited to have you join PredictIQ.</p>
          
          <div class="highlight-card">
            With PredictIQ, you can manage food records, analyze consumption and wastage, and use AI-powered demand predictions to support better food planning and resource management.
          </div>
          
          <p>You can now sign in to your PredictIQ account and start exploring the platform.</p>
          
          <a href="https://predict-iq-green.vercel.app/login" class="btn">
            Login
          </a>
          
          <p>Thank you for choosing PredictIQ!</p>
        </div>

        <div class="footer">
          Best regards,<br/>
          <span class="footer-title">PredictIQ Team</span><br/>
          <span style="font-size: 12px; color: #64748B;">AI-Based Food Demand and Resource Planning System</span>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""Hello {display_name},

Welcome to PredictIQ – AI-Based Food Demand and Resource Planning System!

Your account has been successfully created using this email address. We're excited to have you join PredictIQ.

With PredictIQ, you can manage food records, analyze consumption and wastage, and use AI-powered demand predictions to support better food planning and resource management.

You can now sign in to your PredictIQ account and start exploring the platform:
https://predict-iq-green.vercel.app/login

Thank you for choosing PredictIQ!

Best regards,
PredictIQ Team
AI-Based Food Demand and Resource Planning System
"""

    return _dispatch_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)
