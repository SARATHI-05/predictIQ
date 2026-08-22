import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

def send_verification_email(to_email: str, code: str) -> bool:
    """
    Sends a 6-digit verification code to the recipient's email address via SMTP.
    Supports dual-protocol delivery (Port 465 SSL and Port 587 STARTTLS).
    """
    # Dynamically reload .env to ensure fresh credentials
    load_dotenv(override=True)

    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = (os.getenv("SMTP_USER") or "predictiqfoodmanagement@gmail.com").strip()
    smtp_pass = (os.getenv("SMTP_PASSWORD") or "slfr ywbj lulq zzuy").strip().replace(" ", "")
    from_email = (os.getenv("EMAILS_FROM_EMAIL") or smtp_user).strip()

    subject = f"{code} is your PredictIQ verification code"

    # HTML Email Template
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

    # Plain text alternative
    text_content = f"""PredictIQ Password Reset Verification
    
Your 6-digit verification code is: {code}

This code expires in 15 minutes. If you did not request this password reset, please ignore this email.
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PredictIQ Security <{from_email}>"
    msg["To"] = to_email

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    # Attempt 1: Direct SSL on Port 465 (Most reliable for cloud environments)
    try:
        print(f"[Email Service] Attempting delivery to {to_email} via SSL ({smtp_host}:465)...")
        ssl_ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, 465, context=ssl_ctx, timeout=12) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
            print(f"[Email Service SUCCESS] Verification code {code} delivered to {to_email} via SSL 465!")
            return True
    except Exception as ssl_err:
        print(f"[Email Service NOTICE] SSL 465 attempt failed: {ssl_err}. Trying STARTTLS on 587...")

    # Attempt 2: STARTTLS on Port 587 (Fallback)
    try:
        print(f"[Email Service] Attempting delivery to {to_email} via STARTTLS ({smtp_host}:587)...")
        with smtplib.SMTP(smtp_host, 587, timeout=12) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
            print(f"[Email Service SUCCESS] Verification code {code} delivered to {to_email} via STARTTLS 587!")
            return True
    except Exception as tls_err:
        print(f"[Email Service ERROR] Both SSL 465 and STARTTLS 587 delivery failed for {to_email}: {tls_err}")

    return False
