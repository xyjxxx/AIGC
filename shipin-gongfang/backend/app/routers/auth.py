"""认证 API — 登录、管理员注册用户、用户管理"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import User
from app.utils.auth import hash_password, verify_password, create_access_token
from app.utils.auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(username: str, password: str, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(
        select(User).where(User.username == username, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = create_access_token(user.id, user.role)

    response = JSONResponse({
        "ok": True,
        "token": token,
        "user": {
            "id": user.id, "username": user.username,
            "displayName": user.display_name, "role": user.role,
        }
    })
    response.set_cookie(
        key="auth_token", value=token,
        httponly=True, max_age=86400, samesite="lax",
    )
    return response


@router.post("/logout")
async def logout():
    """退出登录"""
    response = JSONResponse({"ok": True})
    response.delete_cookie("auth_token")
    return response


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """获取当前用户信息"""
    result = await db.execute(select(User).where(User.id == user["user_id"]))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404, "用户不存在")
    return {
        "user": {
            "id": u.id, "username": u.username,
            "displayName": u.display_name, "role": u.role,
        }
    }


@router.post("/admin/register-user")
async def admin_register_user(
    username: str, password: str, display_name: str = "",
    admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    """管理员注册新用户"""
    # 检查用户名是否已存在
    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6位")

    user = User(
        username=username,
        password_hash=hash_password(password),
        display_name=display_name or username,
        role="user",
        created_by=admin["user_id"],
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return {
        "ok": True,
        "user": {
            "id": user.id, "username": user.username,
            "displayName": user.display_name, "role": user.role,
        }
    }


@router.get("/admin/users")
async def admin_list_users(
    admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    """管理员查看所有用户"""
    result = await db.execute(select(User).order_by(desc(User.created_at)))
    users = result.scalars().all()
    return {
        "users": [
            {
                "id": u.id, "username": u.username,
                "displayName": u.display_name, "role": u.role,
                "isActive": u.is_active, "createdAt": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ]
    }


@router.put("/admin/users/{user_id}/toggle")
async def admin_toggle_user(
    user_id: int,
    admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    """管理员启用/禁用用户"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "用户不存在")
    if user.role == "admin":
        raise HTTPException(400, "不能禁用管理员账号")
    user.is_active = not user.is_active
    return {"ok": True, "isActive": user.is_active}


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    """管理员删除用户"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "用户不存在")
    if user.role == "admin":
        raise HTTPException(400, "不能删除管理员账号")
    await db.delete(user)
    return {"ok": True}


# ===== 初始化管理员账号 =====
async def init_admin(db: AsyncSession):
    """首次启动时创建默认管理员"""
    result = await db.execute(select(User).where(User.role == "admin"))
    if not result.scalar_one_or_none():
        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="系统管理员",
            role="admin",
        )
        db.add(admin)
