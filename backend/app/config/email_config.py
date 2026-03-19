import resend
from app.config.settings import settings

resend.api_key = settings.resend_api_key

DEFAULT_MAIL_FROM = settings.mail_username or "no-reply@resend.dev"


def send_email(
    to_email: str,
    subject: str,
    body: str,
    is_html: bool = False,
    from_email: str = DEFAULT_MAIL_FROM,
):
    """Send an email via Resend.

    Args:
        to_email: recipient email.
        subject: email subject.
        body: plain text or html body.
        is_html: whether to send html content.
        from_email: sender email address.
    """
    message = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
    }

    if is_html:
        message["html"] = body
    else:
        message["text"] = body

    try:
        response = resend.Emails.send(message)
    except Exception as exc:
        raise RuntimeError(f"Failed to send email: {exc}") from exc

    return response
