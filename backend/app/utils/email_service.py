import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

def send_verification_email(to_email: str, code: str) -> bool:
    """
    Sends a 6-digit email verification code to the recipient's email address.
    Sender is predictiqfoodmanagement@gmail.com and recipient is dynamically set to to_email.
    """
    load_dotenv(override=True)

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "predictiqfoodmanagement@gmail.com").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
    from_email = os.getenv("EMAILS_FROM_EMAIL", smtp_user or "predictiqfoodmanagement@gmail.com").strip()

    recipient = to_email.strip().lower()
    subject = "PredictIQ Email Verification"

    # Plain-text version
    text_content = f"""PredictIQ

Verify Your Email

Your 6-digit verification code is:

{code}

This code will expire in 10 minutes.

If you did not request this verification, you can safely ignore this email.

Regards,
PredictIQ Team
"""

    # Professional responsive Cyber Dark HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PredictIQ Email Verification</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; color: #E2E8F0; margin: 0; padding: 20px; }}
    .wrapper {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .logo-container {{ text-align: center; margin-bottom: 24px; }}
    .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }}
    .accent {{ color: #10B981; }}
    .badge {{ display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34D399; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }}
    .heading {{ font-size: 20px; font-weight: 700; color: #FFFFFF; margin: 16px 0 8px; text-align: center; }}
    .subtext {{ font-size: 14px; color: #94A3B8; text-align: center; margin-bottom: 24px; line-height: 1.5; }}
    .code-card {{ background: #0B1120; border: 2px dashed #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
    .code-label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; font-weight: 600; margin-bottom: 8px; }}
    .code-value {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #34D399; font-family: 'Courier New', Courier, monospace; line-height: 1; }}
    .note {{ font-size: 13px; color: #64748B; line-height: 1.5; text-align: center; margin: 20px 0 0; }}
    .footer {{ margin-top: 32px; padding-top: 16px; border-top: 1px solid #1E293B; text-align: center; font-size: 12px; color: #475569; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <div class="logo">Predict<span class="accent">IQ</span></div>
      <div class="badge">AI Food Management</div>
    </div>
    
    <div class="heading">Verify Your Email</div>
    <div class="subtext">
      Please enter the 6-digit verification code below to verify your email address (<strong>{recipient}</strong>) and complete your PredictIQ registration.
    </div>

    <div class="code-card">
      <div class="code-label">Your 6-Digit Verification Code</div>
      <div class="code-value">{code}</div>
    </div>

    <p class="note">
      This code will expire in <strong>10 minutes</strong>.<br>
      If you did not request this verification, you can safely ignore this email.
    </p>

    <div class="footer">
      Regards,<br>
      <strong>PredictIQ Team</strong><br>
      Automated Security Notification &bull; Do not reply to this email
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PredictIQ Team <{from_email}>"
    msg["To"] = recipient

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    if not smtp_pass:
        print("\n" + "="*70)
        print(f"[PREDICTIQ EMAIL VERIFICATION - CONSOLE FALLBACK]")
        print(f"From: {from_email}")
        print(f"To: {recipient}")
        print(f"Subject: {subject}")
        print(f"Verification Code: {code}")
        print("="*70 + "\n")
        return True

    try:
        print(f"[Email Service] Sending verification email from {from_email} to {recipient}...")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [recipient], msg.as_string())
            print(f"[Email Service SUCCESS] Verification code {code} successfully delivered to {recipient}!")
            return True
    except Exception as e:
        print(f"[Email Service ERROR] Failed to send verification email to {recipient}: {e}")
        return False


def send_welcome_email(to_email: str, user_name: str) -> bool:
    """
    Sends a welcome email after successful email verification / signup.
    Sender is predictiqfoodmanagement@gmail.com and recipient is dynamically set to to_email.
    """
    load_dotenv(override=True)

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "predictiqfoodmanagement@gmail.com").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
    from_email = os.getenv("EMAILS_FROM_EMAIL", smtp_user or "predictiqfoodmanagement@gmail.com").strip()

    recipient = to_email.strip().lower()
    name = (user_name or recipient.split('@')[0]).strip().capitalize()
    subject = "Welcome to PredictIQ!"

    # Plain-text version
    text_content = f"""Hi {name},

Welcome to PredictIQ!

Your account has been successfully created and your email has been verified.

You can now use PredictIQ for food demand prediction, resource planning, analytics, and food-wastage reduction.

Registered Email:
{recipient}

Thank you for joining PredictIQ!

Best regards,
PredictIQ Team
"""

    # Professional responsive Cyber Dark HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PredictIQ!</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; color: #E2E8F0; margin: 0; padding: 20px; }}
    .wrapper {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .logo-container {{ text-align: center; margin-bottom: 24px; }}
    .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }}
    .accent {{ color: #10B981; }}
    .badge {{ display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34D399; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }}
    .greeting {{ font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 12px; text-align: center; }}
    .welcome-text {{ font-size: 15px; color: #94A3B8; line-height: 1.6; text-align: center; margin-bottom: 24px; }}
    .details-box {{ background: #0B1120; border: 1px solid #1E293B; border-radius: 12px; padding: 20px; margin: 24px 0; }}
    .feature-item {{ display: flex; align-items: center; margin-bottom: 12px; font-size: 14px; color: #E2E8F0; }}
    .feature-icon {{ color: #10B981; margin-right: 10px; font-weight: 800; }}
    .account-info {{ margin-top: 16px; padding-top: 16px; border-top: 1px solid #1E293B; font-size: 13px; color: #94A3B8; }}
    .footer {{ margin-top: 32px; padding-top: 16px; border-top: 1px solid #1E293B; text-align: center; font-size: 12px; color: #475569; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-container">
      <div class="logo">Predict<span class="accent">IQ</span></div>
      <div class="badge">AI Food Demand & Resource Planning</div>
    </div>

    <div class="greeting">Welcome to PredictIQ, {name}! 🎉</div>
    <div class="welcome-text">
      Your account has been successfully created and your email has been verified.<br>
      You now have full access to our AI food intelligence platform.
    </div>

    <div class="details-box">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #38BDF8; margin-bottom: 14px;">
        Platform Capabilities Ready:
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#10003;</span> AI Food Demand & Attendance Forecasting
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#10003;</span> Automated Ingredient & Resource Planning
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#10003;</span> Food Wastage Reduction & Cost Optimization
      </div>
      <div class="feature-item">
        <span class="feature-icon">&#10003;</span> Live Inventory, Surplus Alerts & Audit Trail
      </div>

      <div class="account-info">
        <strong>Registered Email:</strong> <span style="color: #FFFFFF;">{recipient}</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #94A3B8; text-align: center; margin: 24px 0;">
      Thank you for joining PredictIQ!
    </p>

    <div class="footer">
      Best regards,<br>
      <strong>PredictIQ Team</strong><br>
      Need help? Reach us at predictiqfoodmanagement@gmail.com
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"PredictIQ Team <{from_email}>"
    msg["To"] = recipient

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    if not smtp_pass:
        print("\n" + "="*70)
        print(f"[PREDICTIQ WELCOME EMAIL - CONSOLE FALLBACK]")
        print(f"From: {from_email}")
        print(f"To: {recipient}")
        print(f"Subject: {subject}")
        print(f"User: {name}")
        print("="*70 + "\n")
        return True

    try:
        print(f"[Email Service] Sending welcome email from {from_email} to {recipient}...")
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [recipient], msg.as_string())
            print(f"[Email Service SUCCESS] Welcome email successfully delivered to {recipient}!")
            return True
    except Exception as e:
        print(f"[Email Service ERROR] Failed to send welcome email to {recipient}: {e}")
        return False
