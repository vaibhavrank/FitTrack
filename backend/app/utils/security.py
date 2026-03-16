import hashlib
import secrets


def hash_password(password: str) -> str:
    """Hash a password using a random salt.

    Stored format is: "<salt>$<sha256(salt+password)>".
    """
    salt = secrets.token_hex(16)
    digest = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify an unhashed password against the stored hash."""
    if not stored_hash:
        return False

    try:
        salt, digest = stored_hash.split("$", 1)
    except ValueError:
        return False

    return hashlib.sha256((salt + password).encode()).hexdigest() == digest
