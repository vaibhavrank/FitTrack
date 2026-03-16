from fastapi_mail import ConnectionConfig

from app.config import settings


conf = ConnectionConfig(
    MAIL_USERNAME=settings.settings.mail_username,
    MAIL_PASSWORD=settings.settings.mail_password,
    MAIL_FROM="vaibhavrank20@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)