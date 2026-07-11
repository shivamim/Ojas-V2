from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=settings.ENCRYPTION_SALT.encode(),
    iterations=480000,
)
KEY = base64.urlsafe_b64encode(kdf.derive(settings.ENCRYPTION_KEY.encode()))
fernet = Fernet(KEY)

def encrypt_field(plaintext: str) -> str:
    """Encrypt a field value using Fernet symmetric encryption."""
    if not plaintext:
        return ""
    try:
        return fernet.encrypt(plaintext.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        raise ValueError(f"Encryption failed: {str(e)}")

def decrypt_field(ciphertext: str) -> str:
    """Decrypt a field value. Returns placeholder on failure to prevent crashes."""
    if not ciphertext:
        return ""
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except Exception as e:
        # Log error but don't crash — return placeholder for corrupted data
        logger.warning(f"Decryption error (data may be corrupted): {e}")
        return "[DECRYPT_FAILED]"
