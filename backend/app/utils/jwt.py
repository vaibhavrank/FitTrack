"""Minimal JWT helper utilities.

This module provides a small, dependency-free implementation of JWT
encoding/decoding using HS256 (HMAC-SHA256).

This is intentionally lightweight to avoid introducing extra dependencies.
"""

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def encode_jwt(payload: Dict[str, Any], secret: str, exp_minutes: int = 60) -> str:
    """Encode a JWT token with expiration (exp).

    The payload will be copied, and an exp claim will be set if not already present.
    """

    now = int(datetime.utcnow().timestamp())
    payload = payload.copy()
    payload.setdefault("iat", now)
    payload.setdefault("exp", now + exp_minutes * 60)

    header = {"alg": "HS256", "typ": "JWT"}

    parts = [
        _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8")),
        _base64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")),
    ]

    signing_input = ".".join(parts).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    parts.append(_base64url_encode(signature))

    return ".".join(parts)


def decode_jwt(token: str, secret: str) -> Optional[Dict[str, Any]]:
    """Decode and validate a JWT token.

    Returns the payload dict if valid (including expiration check), otherwise None.
    """

    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        return None

    try:
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        signature = _base64url_decode(signature_b64)
        expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes)
    except Exception:
        return None

    exp = payload.get("exp")
    if exp is not None:
        try:
            exp = int(exp)
        except (TypeError, ValueError):
            return None
        if datetime.utcnow().timestamp() > exp:
            return None

    return payload
