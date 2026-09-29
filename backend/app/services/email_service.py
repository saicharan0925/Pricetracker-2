"""Email delivery service supporting Resend API (HTTPS) and SMTP (Gmail/Brevo)."""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import httpx

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def is_resend_configured() -> bool:
    """Check whether Resend API key is present."""
    settings = get_settings()
    return bool(settings.RESEND_API_KEY and settings.RESEND_API_KEY.strip())


def is_smtp_configured() -> bool:
    """Check whether SMTP credentials are present in configuration."""
    settings = get_settings()
    return bool(settings.SMTP_SERVER and settings.SMTP_USERNAME and settings.SMTP_PASSWORD)


def is_email_configured() -> bool:
    """Check whether any email delivery channel (Resend or SMTP) is configured."""
    return is_resend_configured() or is_smtp_configured()


def get_smtp_status() -> dict:
    """Return status and configuration details (masking secrets) for diagnostics."""
    settings = get_settings()
    resend_ready = is_resend_configured()
    smtp_ready = is_smtp_configured()
    configured = resend_ready or smtp_ready

    provider = "resend" if resend_ready else ("smtp" if smtp_ready else "none")

    if resend_ready:
        instructions = "Resend API is active and ready (sending from " + (settings.RESEND_FROM or "onboarding@resend.dev") + ")."
    elif smtp_ready:
        instructions = f"SMTP is active ({settings.SMTP_SERVER}:{settings.SMTP_PORT})."
    else:
        instructions = (
            "To send live emails, add either RESEND_API_KEY (Recommended from https://resend.com) "
            "or SMTP credentials to backend/.env."
        )

    return {
        "configured": configured,
        "provider": provider,
        "resend_active": resend_ready,
        "resend_from": settings.RESEND_FROM or "SmartPrice <onboarding@resend.dev>",
        "smtp_server": settings.SMTP_SERVER or None,
        "smtp_port": settings.SMTP_PORT,
        "smtp_username": settings.SMTP_USERNAME or None,
        "from_email": settings.RESEND_FROM if resend_ready else (settings.FROM_EMAIL or settings.SMTP_USERNAME or None),
        "instructions": instructions,
    }


def _send_via_resend(to_email: str, subject: str, html_body: str, text_body: str) -> tuple[bool, str]:
    """Deliver email using Resend REST API (https://resend.com)."""
    settings = get_settings()
    api_key = settings.RESEND_API_KEY.strip()
    from_sender = settings.RESEND_FROM or "SmartPrice <onboarding@resend.dev>"

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SmartPriceTracker/1.0",
    }
    payload = {
        "from": from_sender,
        "to": [to_email],
        "subject": subject,
        "html": html_body,
        "text": text_body,
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            data = resp.json() if "application/json" in resp.headers.get("content-type", "") else {}

            if resp.status_code in (200, 201):
                email_id = data.get("id", "ok")
                logger.info("Email delivered via Resend API to %s (id=%s, subject=%r)", to_email, email_id, subject)
                return True, f"Email delivered via Resend API (id: {email_id})"
            else:
                err_msg = data.get("message") or f"HTTP {resp.status_code}: {resp.text}"
                logger.error("Resend API delivery error to %s: %s", to_email, err_msg)
                return False, f"Resend API error: {err_msg}"
    except Exception as exc:
        err = f"Failed to connect to Resend API: {exc}"
        logger.error(err)
        return False, err


def _send_via_smtp(to_email: str, subject: str, html_body: str, text_body: str) -> tuple[bool, str]:
    """Deliver email using standard SMTP (smtplib)."""
    settings = get_settings()
    from_email = settings.FROM_EMAIL or settings.SMTP_USERNAME
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        username = settings.SMTP_USERNAME.strip()
        password = settings.SMTP_PASSWORD.strip()
        if settings.SMTP_PORT == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_SERVER.strip(), settings.SMTP_PORT, context=context, timeout=20) as server:
                server.login(username, password)
                server.sendmail(from_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_SERVER.strip(), settings.SMTP_PORT, timeout=20) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(username, password)
                server.sendmail(from_email, [to_email], msg.as_string())

        logger.info("Email delivered via SMTP to %s (subject=%r)", to_email, subject)
        return True, "Email sent successfully via SMTP"
    except smtplib.SMTPAuthenticationError as exc:
        err = f"SMTP Authentication failed: {exc}. If using Gmail, make sure you use a 16-character App Password, not your regular password."
        logger.error(err)
        return False, err
    except Exception as exc:
        err = f"Failed to send email to {to_email}: {exc}"
        logger.error(err)
        return False, err


def _send_mail(to_email: str, subject: str, html_body: str, text_body: str) -> tuple[bool, str]:
    """Unified email router: Resend API -> SMTP fallback -> Simulation."""
    if is_resend_configured():
        success, msg = _send_via_resend(to_email, subject, html_body, text_body)
        if success:
            return True, msg
        # If Resend failed (e.g. sandbox restriction to other recipients) and SMTP is configured, fall back to SMTP!
        if is_smtp_configured():
            logger.info("Resend rejected recipient %s (%s). Automatically delivering via Gmail SMTP...", to_email, msg)
            return _send_via_smtp(to_email, subject, html_body, text_body)
        return False, msg

    if is_smtp_configured():
        return _send_via_smtp(to_email, subject, html_body, text_body)

    logger.warning(
        "No email service configured (RESEND_API_KEY or SMTP) in backend/.env - skipping delivery to %s (subject=%r)",
        to_email,
        subject,
    )
    logger.info(
        "\n========== [SIMULATED EMAIL NOTIFICATION] ==========\n"
        "To: %s\nSubject: %s\nBody:\n%s\n"
        "=====================================================",
        to_email,
        subject,
        text_body,
    )
    return False, "Neither RESEND_API_KEY nor SMTP credentials configured in backend/.env. Simulated email logged."


def send_verification_email(
    to_email: str,
    product_name: str,
    desired_price: Optional[float] = None,
    current_price: Optional[float] = None,
    product_url: Optional[str] = None,
) -> bool:
    """Notify user that price tracking has successfully started for a product."""
    subject = f"Price Tracking Started: {product_name[:50]}"
    current_str = f"Rs.{current_price:,.2f}" if current_price is not None else "Checking now..."
    desired_str = f"Rs.{desired_price:,.2f}" if desired_price is not None else "N/A"

    text_body = (
        f"Hi,\n\n"
        f"You are now tracking '{product_name}'.\n\n"
        f"Target Price: {desired_str}\n"
        f"Current Price: {current_str}\n"
        f"Product Link: {product_url or 'N/A'}\n\n"
        f"We will monitor this product 24/7 and email you at {to_email} the instant the price hits or drops below your target.\n\n"
        f"- SmartPrice Tracker"
    )

    store_btn = (
        f"""
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0 14px 0;">
          <tr>
            <td align="center" style="border-radius: 12px; background-color: #6366f1;">
              <a href="{product_url}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 14px 20px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; text-align: center; border-radius: 12px; letter-spacing: 0.3px;">
                View Product in Store &rarr;
              </a>
            </td>
          </tr>
        </table>
        """
        if product_url
        else ""
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #0b1120; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 18px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 24px 20px 14px 20px; text-align: left; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #312e81; color: #c7d2fe; border: 1px solid #6366f1; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">
                TRACKING ACTIVATED &#10003;
              </div>
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 22px; font-weight: 800; line-height: 1.25; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                Tracking Activated!
              </h1>
              <p style="margin: 0 0 18px 0; color: #94a3b8; font-size: 14px; line-height: 1.5; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                You are now tracking <strong style="color: #f8fafc;">{product_name}</strong>. We will notify you the second the price hits your target.
              </p>

              <!-- Price Comparison Tiles -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                <tr>
                  <!-- Current Price Tile -->
                  <td width="48%" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 14px 12px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      Current Price
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 6px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      {current_str}
                    </div>
                  </td>
                  <td width="4%"></td>
                  <!-- Target Price Tile -->
                  <td width="48%" style="background-color: #0f172a; border: 1px solid #059669; border-radius: 14px; padding: 14px 12px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #34d399; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      Target Price
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #34d399; margin-top: 6px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      {desired_str}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Alert Email Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 10px;">
                <tr>
                  <td style="padding: 10px 14px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8; line-height: 1.4;">
                    <span style="color: #818cf8; font-weight: 700;">Alerts Sent To:</span>
                    <span style="color: #e2e8f0; font-weight: 600; word-break: break-all; margin-left: 6px;">{to_email}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              {store_btn}

              <!-- Footer -->
              <p style="margin: 18px 0 0 0; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                Sent automatically by <strong style="color: #94a3b8;">SmartPrice Tracker</strong> &bull; 24/7 Live Monitoring
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    success, _ = _send_mail(to_email, subject, html_body, text_body)
    return success


def send_price_drop_email(
    to_email: str,
    product_name: str,
    current_price: float,
    desired_price: float,
    product_url: str,
) -> bool:
    """Notify user that a tracked product dropped to or below their desired target price."""
    savings = max(desired_price - current_price, 0)
    subject = f"Price Dropped! 🎉 {product_name[:50]}"
    text_body = (
        f"Great news!\n\n"
        f"'{product_name}' has dropped to your target price!\n\n"
        f"Current Price: Rs.{current_price:,.2f}\n"
        f"Target Price:  Rs.{desired_price:,.2f}\n"
        f"You Save:      Rs.{savings:,.2f}\n\n"
        f"Buy now before stock or price changes:\n{product_url}\n\n"
        f"- SmartPrice Tracker"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #0b1120; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #1e293b; border-radius: 18px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 24px 20px 14px 20px; text-align: left; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
              <div style="display: inline-block; padding: 5px 12px; background-color: #064e3b; color: #a7f3d0; border: 1px solid #10b981; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px;">
                PRICE DROP HIT &#127881;
              </div>
              <h1 style="margin: 0 0 8px 0; color: #ffffff; font-size: 22px; font-weight: 800; line-height: 1.25; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                Your Target Price Was Hit!
              </h1>
              <p style="margin: 0 0 18px 0; color: #94a3b8; font-size: 14px; line-height: 1.5; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                <strong style="color: #f8fafc;">{product_name}</strong> has just dropped to or below your target price.
              </p>

              <!-- Price & Savings Tiles -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 14px;">
                <tr>
                  <!-- Deal Price Tile -->
                  <td width="48%" style="background-color: #0f172a; border: 1px solid #10b981; border-radius: 14px; padding: 14px 12px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #34d399; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      New Low Price
                    </div>
                    <div style="font-size: 22px; font-weight: 900; color: #34d399; margin-top: 6px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      Rs.{current_price:,.2f}
                    </div>
                  </td>
                  <td width="4%"></td>
                  <!-- Savings Tile -->
                  <td width="48%" style="background-color: #0f172a; border: 1px solid #6366f1; border-radius: 14px; padding: 14px 12px; vertical-align: top;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #a5b4fc; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      You Save
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #c7d2fe; margin-top: 6px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                      Rs.{savings:,.2f}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Target reference row -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; margin-bottom: 12px;">
                <tr>
                  <td style="padding: 10px 14px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8;">
                    <span>Your Target: <strong style="color: #f1f5f9;">Rs.{desired_price:,.2f}</strong></span>
                    <span style="float: right; color: #818cf8;">Instant Deal</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 22px 0 14px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #10b981;">
                    <a href="{product_url}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 14px 20px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; text-align: center; border-radius: 12px; letter-spacing: 0.3px;">
                      Buy Now at Deal Price &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <p style="margin: 18px 0 0 0; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
                Sent automatically by <strong style="color: #94a3b8;">SmartPrice Tracker</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    success, _ = _send_mail(to_email, subject, html_body, text_body)
    return success


def send_test_email(to_email: str) -> dict:
    """Send a diagnostic test email and return status and detailed message."""
    subject = "SmartPrice Tracker - Test Email"
    text_body = (
        "Hello,\n\n"
        "This is a test email from your SmartPrice Tracker installation.\n"
        "Your email alert configuration is working correctly!\n\n"
        "- SmartPrice Tracker"
    )
    html_body = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #0b1120; font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
          <tr>
            <td style="font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; text-align: left;">
              <div style="display: inline-block; padding: 4px 10px; background-color: #064e3b; color: #a7f3d0; border-radius: 999px; font-size: 11px; font-weight: 700; margin-bottom: 12px;">
                CONNECTED &#10003;
              </div>
              <h2 style="color: #34d399; margin: 0 0 10px 0; font-size: 20px; font-weight: 800;">
                Email Delivery Working!
              </h2>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                Your email configuration is working perfectly on both mobile and desktop.
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 0; border-top: 1px solid #334155; padding-top: 12px;">
                SmartPrice Tracker &bull; 24/7 Live Monitoring
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    success, msg = _send_mail(to_email, subject, html_body, text_body)
    return {"success": success, "message": msg}
