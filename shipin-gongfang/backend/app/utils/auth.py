"""认证工具 — JWT + 密码哈希"""
import hashlib
import hmac
import time
import json
import base64
import os
from typing import Optional
from app.config import settings

SECRET_KEY = settings.jwt_secret


def hash_password(password: str) -> str:
    """bcrypt 风格密码哈希（使用 hashlib 简化实现）"""
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return base64.b64encode(salt + dk).decode()


def verify_password(password: str, stored_hash: str) -> bool:
    """验证密码"""
    try:
        data = base64.b64decode(stored_hash)
        salt, dk = data[:16], data[16:]
        new_dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return hmac.compare_digest(dk, new_dk)
    except Exception:
        return False


def create_access_token(user_id: int, role: str, expires_minutes: int = 1440) -> str:
    """创建 JWT 风格的访问令牌"""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "user_id": user_id, "role": role,
        "exp": int(time.time()) + expires_minutes * 60,
        "iat": int(time.time()),
    }).encode()).decode().rstrip("=")
    signature = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{header}.{payload}.{signature}"


def decode_access_token(token: str) -> Optional[dict]:
    """解析访问令牌"""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        # 验证签名
        expected_sig = hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).hexdigest()[:32]
        if not hmac.compare_digest(signature, expected_sig):
            return None
        # 补齐 base64 padding
        payload += "=" * (4 - len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None
