import os
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from dotenv import load_dotenv

# Load environment variables without overriding live Render environment
load_dotenv(override=False)

def get_smtp_config():
    """
    Retrieve unified SMTP configuration from environment variables with safe fallbacks.
    """
    smtp_host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError:
        smtp_port = 587

    smtp_user = (
        os.getenv("SMTP_USERNAME") or 
        os.getenv("SMTP_USER") or 
        "predictiqfoodmanagement@gmail.com"
    ).strip()

    smtp_pass = (
        os.getenv("SMTP_PASSWORD") or 
        "slfr ywbj lulq zzuy"
    ).strip().replace(" ", "")

    from_email = (
        os.getenv("SMTP_FROM_EMAIL") or 
        os.getenv("EMAILS_FROM_EMAIL") or 
        smtp_user
    ).strip()

    from_name = (os.getenv("SMTP_FROM_NAME") or "PredictIQ").strip()

    return {
        "host": smtp_host,
        "port": smtp_port,
        "user": smtp_user,
        "password": smtp_pass,
        "from_email": from_email,
        "from_name": from_name,
    }


from email.utils import formatdate, make_msgid

def _dispatch_email(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
    """
    Unified SMTP dispatcher.
    Ensures that recipient is strictly the user's entered email address (to_email).
    Includes RFC 5322 deliverability headers (Date, Message-ID, Reply-To) to ensure
    emails pass mobile spam filters directly into the Inbox.
    """
    if not to_email or not isinstance(to_email, str) or "@" not in to_email:
        print(f"[Email Service ERROR] Invalid recipient email address: '{to_email}'")
        return False

    recipient = to_email.strip().lower()
    config = get_smtp_config()

    msg = MIMEMultipart("alternative")
    msg["Subject"] = Header(subject, "utf-8")
    msg["From"] = f"{config['from_name']} <{config['from_email']}>"
    msg["To"] = recipient
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="gmail.com")
    msg["Reply-To"] = config["from_email"]
    msg["X-Mailer"] = "PredictIQ-Mailer/2.0"

    # Attach both plain text and rich HTML content
    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Determine attempt order based on configured port
    ports_to_try = [config["port"]]
    fallback_port = 465 if config["port"] == 587 else 587
    if fallback_port not in ports_to_try:
        ports_to_try.append(fallback_port)

    for port in ports_to_try:
        try:
            if port == 465:
                ssl_ctx = ssl.create_default_context()
                with smtplib.SMTP_SSL(config["host"], 465, context=ssl_ctx, timeout=12) as server:
                    server.login(config["user"], config["password"])
                    server.send_message(msg, from_addr=config["from_email"], to_addrs=[recipient])
                    print(f"[Email Service SUCCESS] '{subject}' delivered to {recipient} via SSL 465!")
                    return True
            else:
                with smtplib.SMTP(config["host"], 587, timeout=12) as server:
                    server.starttls()
                    server.login(config["user"], config["password"])
                    server.send_message(msg, from_addr=config["from_email"], to_addrs=[recipient])
                    print(f"[Email Service SUCCESS] '{subject}' delivered to {recipient} via STARTTLS 587!")
                    return True
        except Exception as err:
            print(f"[Email Service NOTICE] Attempt on port {port} for {recipient} failed: {err}")

    print(f"[Email Service ERROR] All delivery attempts failed for {recipient}")
    return False


def send_signup_verification_code(email: str, otp: str, name: str = "") -> bool:
    """
    Sends a 6-digit verification code specifically for completing new user registration.
    Recipient: User's entered email address.
    """
    display_name = name.strip() if name else email.split("@")[0].capitalize()
    subject = f"{otp} is your PredictIQ signup verification code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 24px 12px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 6px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-bottom: 24px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #F8FAFC; margin-bottom: 12px; }}
        .desc {{ font-size: 14px; color: #94A3B8; line-height: 1.5; margin-bottom: 20px; }}
        .code-box {{ background: #0B0F17; border: 1px dashed #10B981; border-radius: 12px; padding: 18px 24px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #34D399; font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; margin: 20px 0; }}
        .note {{ font-size: 13px; color: #64748B; line-height: 1.5; margin-top: 22px; }}
        .security-tip {{ background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #FBBF24; margin-top: 20px; text-align: left; }}
        .footer {{ margin-top: 28px; font-size: 12px; color: #475569; border-top: 1px solid #1E293B; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Predict<span class="accent">IQ</span></div>
        <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        
        <div class="greeting">Welcome to PredictIQ, {display_name}!</div>
        <div class="desc">
          Thank you for signing up. Please enter the following 6-digit verification code to complete your account registration:
        </div>

        <div class="code-box">{otp}</div>

        <div class="security-tip">
          🔒 <strong>Security Note:</strong> This code expires in <strong>10 minutes</strong>. Never share this code with anyone.
        </div>

        <div class="note">
          If you did not attempt to create a PredictIQ account, you can safely disregard this email.
        </div>

        <div class="footer">
          PredictIQ Automated Security & Onboarding Service
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""PredictIQ Signup Verification

Hello {display_name},

Welcome to PredictIQ! Your 6-digit registration verification code is:

{otp}

This code is valid for 10 minutes. Please enter it on the verification screen to complete your account registration.

Security Notice: Never share this code with anyone. If you did not create an account, please ignore this email.

Best regards,
PredictIQ Team
"""

    return _dispatch_email(to_email=email, subject=subject, html_content=html_content, text_content=text_content)


def send_forgot_password_code(email: str, otp: str, name: str = "") -> bool:
    """
    Sends a 6-digit verification code specifically for resetting account password.
    Recipient: User's registered email address.
    """
    display_name = name.strip() if name else email.split("@")[0].capitalize()
    subject = f"{otp} is your PredictIQ password reset code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 24px 12px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 6px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-bottom: 24px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #F8FAFC; margin-bottom: 12px; }}
        .desc {{ font-size: 14px; color: #94A3B8; line-height: 1.5; margin-bottom: 20px; }}
        .code-box {{ background: #0B0F17; border: 1px dashed #06B6D4; border-radius: 12px; padding: 18px 24px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38BDF8; font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; margin: 20px 0; }}
        .note {{ font-size: 13px; color: #64748B; line-height: 1.5; margin-top: 22px; }}
        .security-tip {{ background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #F87171; margin-top: 20px; text-align: left; }}
        .footer {{ margin-top: 28px; font-size: 12px; color: #475569; border-top: 1px solid #1E293B; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Predict<span class="accent">IQ</span></div>
        <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        
        <div class="greeting">Password Reset Request</div>
        <div class="desc">
          Hello {display_name}, we received a request to reset your PredictIQ password. Enter the 6-digit code below to set a new password:
        </div>

        <div class="code-box">{otp}</div>

        <div class="security-tip">
          🛡️ <strong>Security Alert:</strong> This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please change your password immediately or contact support.
        </div>

        <div class="note">
          If you did not initiate this request, you can safely disregard this message.
        </div>

        <div class="footer">
          PredictIQ Automated Security Service
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""PredictIQ Password Reset

Hello {display_name},

We received a request to reset your PredictIQ password. Your 6-digit verification code is:

{otp}

This code expires in 10 minutes. Enter this code on the password reset screen to continue.

Security Note: If you did not request this password reset, please ignore this email.

Best regards,
PredictIQ Security Team
"""

    return _dispatch_email(to_email=email, subject=subject, html_content=html_content, text_content=text_content)


def send_welcome_email(email: str, name: str = "", role: str = "Staff") -> bool:
    """
    Sends an official Welcome Email to verified users.
    Recipient: User's verified email address (strictly dynamic).
    """
    display_name = name.strip() if name else email.split("@")[0].replace(".", " ").replace("_", " ").title()
    subject = "Welcome to PredictIQ – Your Account is Ready!"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 24px 12px; line-height: 1.6; }}
        .container {{ max-width: 560px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 30px; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }}
        .header {{ text-align: center; margin-bottom: 24px; }}
        .logo {{ font-size: 28px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-top: 4px; }}
        .content {{ font-size: 15px; color: #CBD5E1; }}
        .features-list {{ background: #0B0F17; border-left: 3px solid #10B981; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 14px; color: #E2E8F0; }}
        .features-list ul {{ margin: 8px 0 0 0; padding-left: 20px; }}
        .features-list li {{ margin-bottom: 6px; color: #CBD5E1; }}
        .btn {{ display: block; background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: #FFFFFF !important; font-weight: 700; font-size: 15px; text-align: center; text-decoration: none; padding: 14px 24px; border-radius: 10px; margin: 26px 0 18px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); }}
        .footer {{ margin-top: 30px; font-size: 13px; color: #94A3B8; border-top: 1px solid #1E293B; padding-top: 20px; }}
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
          <p style="font-size: 17px; font-weight: 700; color: #FFFFFF; margin-top: 0;">Hello {display_name},</p>
          
          <p>Welcome to <strong>PredictIQ</strong> – AI-Based Food Demand and Resource Planning System!</p>
          
          <p>Your PredictIQ account has been successfully created and verified.</p>
          
          <div class="features-list">
            <strong>You can now use PredictIQ to:</strong>
            <ul>
              <li>Monitor food preparation and consumption</li>
              <li>Generate AI-based food demand predictions</li>
              <li>Analyze food demand trends</li>
              <li>Track food wastage and leftovers</li>
              <li>Receive alerts</li>
              <li>Manage datasets and records</li>
              <li>Generate reports and analytics</li>
            </ul>
          </div>
          
          <p>Your account is now ready to use.</p>
          
          <a href="https://predict-iq-green.vercel.app/" class="btn">
            Login to PredictIQ
          </a>

          <p style="font-size: 13px; color: #94A3B8; margin-top: 15px;">
            Thank you for joining PredictIQ.
          </p>
        </div>

        <div class="footer">
          Best regards,<br/>
          <span class="footer-title">PredictIQ Team</span><br/>
          <a href="mailto:predictiqfoodmanagement@gmail.com" style="color: #10B981; text-decoration: none; font-size: 12px;">predictiqfoodmanagement@gmail.com</a>
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""Hello {display_name},

Welcome to PredictIQ – AI-Based Food Demand and Resource Planning System!

Your PredictIQ account has been successfully created and verified.

You can now use PredictIQ to:
- Monitor food preparation and consumption
- Generate AI-based food demand predictions
- Analyze food demand trends
- Track food wastage and leftovers
- Receive alerts
- Manage datasets and records
- Generate reports and analytics

Your account is now ready to use.

Login:
https://predict-iq-green.vercel.app/

Thank you for joining PredictIQ.

Best regards,
PredictIQ Team
predictiqfoodmanagement@gmail.com
"""

    return _dispatch_email(to_email=email, subject=subject, html_content=html_content, text_content=text_content)


def send_google_verification_email(email: str, otp: str, name: str = "") -> bool:
    """
    Sends a 6-digit verification code specifically for completing Google Account onboarding.
    Recipient: User's Google Gmail address.
    """
    display_name = name.strip() if name else email.split("@")[0].capitalize()
    subject = f"{otp} is your PredictIQ Google Account verification code"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B0F17; color: #E2E8F0; margin: 0; padding: 24px 12px; }}
        .container {{ max-width: 520px; margin: 0 auto; background: #131B2A; border: 1px solid #1E293B; border-radius: 16px; padding: 36px 28px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px; margin-bottom: 6px; }}
        .accent {{ color: #10B981; }}
        .subtitle {{ font-size: 13px; color: #94A3B8; margin-bottom: 24px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #F8FAFC; margin-bottom: 12px; }}
        .desc {{ font-size: 14px; color: #94A3B8; line-height: 1.5; margin-bottom: 20px; }}
        .code-box {{ background: #0B0F17; border: 1px dashed #10B981; border-radius: 12px; padding: 18px 24px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #34D399; font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; margin: 20px 0; }}
        .note {{ font-size: 13px; color: #64748B; line-height: 1.5; margin-top: 22px; }}
        .footer {{ margin-top: 28px; font-size: 12px; color: #475569; border-top: 1px solid #1E293B; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Predict<span class="accent">IQ</span></div>
        <div class="subtitle">AI-Based Food Demand & Resource Planning</div>
        
        <div class="greeting">Verify Your Google Account, {display_name}</div>
        <div class="desc">
          Enter the following 6-digit verification code on the verification screen to activate your PredictIQ account:
        </div>

        <div class="code-box">{otp}</div>

        <div class="note">
          This verification code is valid for <strong>10 minutes</strong>. Never share this code.
        </div>

        <div class="footer">
          PredictIQ Automated Security Service
        </div>
      </div>
    </body>
    </html>
    """

    text_content = f"""PredictIQ Google Account Verification

Hello {display_name},

Your 6-digit verification code is: {otp}

Enter this code on the verification screen to complete your PredictIQ Google signup.
This code expires in 10 minutes.

Best regards,
PredictIQ Team
"""

    return _dispatch_email(to_email=email, subject=subject, html_content=html_content, text_content=text_content)
