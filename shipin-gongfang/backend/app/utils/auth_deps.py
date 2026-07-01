"""认证依赖注入"""
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.utils.auth import decode_access_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取当前登录用户信息（必须登录）"""
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        # 也支持 cookie 中的 token
        token = request.cookies.get("auth_token")

    if not token:
        raise HTTPException(status_code=401, detail="请先登录")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")

    return {"user_id": payload["user_id"], "role": payload["role"]}


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """要求管理员权限"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """获取当前用户（可选，未登录返回 None）"""
    token = None
    if credentials:
        token = credentials.credentials
    if not token:
        token = request.cookies.get("auth_token")
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    return {"user_id": payload["user_id"], "role": payload["role"]}
