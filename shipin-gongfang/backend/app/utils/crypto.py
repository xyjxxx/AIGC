"""API Key 加解密工具"""
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


def _get_key() -> bytes:
    """获取加密密钥（32字节用于 AES-256）"""
    key = settings.encryption_key.encode("utf-8")
    if len(key) < 32:
        key = key.ljust(32, b"0")
    return key[:32]


def encrypt_token(plain_text: str) -> str:
    """
    使用 AES-256-GCM 加密 API Token
    返回 base64( nonce(12字节) + ciphertext + tag(16字节) )
    """
    aesgcm = AESGCM(_get_key())
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    import base64
    return base64.b64encode(nonce + ciphertext).decode("utf-8")


def decrypt_token(encrypted: str) -> str:
    """
    解密 API Token
    """
    import base64
    aesgcm = AESGCM(_get_key())
    data = base64.b64decode(encrypted)
    nonce = data[:12]
    ciphertext = data[12:]
    return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
