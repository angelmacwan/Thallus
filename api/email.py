import os
from typing import Literal

import resend

from core.config import EMAIL_SENDER_ADDRESS


def _get_client() -> None:
    """Configure the Resend API key from the environment."""
    api_key = os.getenv("RESEND_API_KEY", "")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY environment variable is not set.")
    resend.api_key = api_key


def send_otp_email(
    to: str,
    code: str,
    purpose: Literal["signup", "password_reset"],
) -> None:
    _get_client()

    if purpose == "signup":
        subject = "Your Thallus verification code"
        action_phrase = "complete your registration"
    else:
        subject = "Reset your Thallus password"
        action_phrase = "reset your password"

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#1a1d26;border-radius:12px;overflow:hidden;border:1px solid #2a2d3a;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6366f1;">Thallus</p>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f1f5f9;">Verification code</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Use the code below to {action_phrase}. It expires in <strong style="color:#e2e8f0;">10 minutes</strong>.
              </p>
              <div style="background:#0f1117;border-radius:8px;padding:24px;text-align:center;border:1px solid #2a2d3a;">
                <span style="font-size:40px;font-weight:800;letter-spacing:0.3em;font-family:monospace;color:#6366f1;">{code}</span>
              </div>
              <p style="margin:24px 0 0;font-size:13px;color:#475569;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Your account remains secure.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #2a2d3a;">
              <p style="margin:0;font-size:12px;color:#334155;">
                Sent by <strong style="color:#475569;">Thallus Simulation Engine</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    resend.Emails.send({
        "from": EMAIL_SENDER_ADDRESS,
        "to": [to],
        "subject": subject,
        "html": html,
    })


def send_allowlist_welcome_email(to: str) -> None:
    """Send a styled welcome email when a user is promoted from waitlist to the allow list."""
    _get_client()

    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're in — Thallus</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#1a1d26;border-radius:16px;overflow:hidden;border:1px solid #2a2d3a;max-width:520px;width:100%;">

          <!-- Header band -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;
                         text-transform:uppercase;color:rgba(255,255,255,0.65);">Thallus</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">
                You're in. 🎉
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:16px;color:#cbd5e1;line-height:1.7;">
                Great news — your account request has been <strong style="color:#a5b4fc;">approved</strong>.
                You can now sign up and start using Thallus.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center"
                      style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                             border-radius:10px;padding:0;">
                    <a href="https://thallus.staticalabs.com/register"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;
                              color:#ffffff;text-decoration:none;letter-spacing:0.02em;">
                      Create your account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.6;">
                Use the email address <strong style="color:#e2e8f0;">{to}</strong> to register — that's
                the address that has been approved.
              </p>
            </td>
          </tr>

          <!-- What is Thallus -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#0f1117;border-radius:10px;border:1px solid #2a2d3a;padding:0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.1em;
                               text-transform:uppercase;color:#6366f1;">What you get</p>
                    <ul style="margin:0;padding:0 0 0 18px;color:#94a3b8;font-size:14px;line-height:1.8;">
                      <li>AI-powered social simulations with thousands of agent personas</li>
                      <li>Scenario diffing to compare "what-if" outcomes</li>
                      <li>Deep insights engine powered by Gemini</li>
                      <li>Free starter credits on sign-up — no card required</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 40px 24px;border-top:1px solid #2a2d3a;">
              <p style="margin:0;font-size:12px;color:#334155;line-height:1.6;">
                If you didn't request access to Thallus you can safely ignore this email.<br>
                Sent by <strong style="color:#475569;">Thallus · Staticalabs</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    resend.Emails.send({
        "from": EMAIL_SENDER_ADDRESS,
        "to": [to],
        "subject": "You're approved — create your Thallus account",
        "html": html,
    })
