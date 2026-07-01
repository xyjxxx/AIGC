"""认证 API — 登录、管理员注册用户、用户管理、OAuth 平台授权"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
import secrets
import httpx

from app.database import get_db
from app.models import User, UserAIConfig
from app.utils.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.utils.auth_deps import get_current_user, require_admin
from app.utils.crypto import encrypt_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

# OAuth 配置（生产环境需在对应平台注册应用）
OAUTH_CONFIG = {
    "openai": {
        "name": "OpenAI",
        "authorize_url": "https://auth.openai.com/authorize",
        "token_url": "https://auth.openai.com/token",
        "client_id": "shipin-gongfang",
        "scope": "openid model.read",
    },
    "doubao": {
        "name": "豆包",
        "authorize_url": "https://auth.bytedance.com/oauth/authorize",
        "token_url": "https://auth.bytedance.com/oauth/token",
        "client_id": "shipin-gongfang",
        "scope": "user:ai:call",
    },
}

# 开发模式：使用本地模拟授权（无需真实平台注册）
DEV_MODE = True

# 临时 state 存储（生产环境用 Redis）
oauth_states: dict = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterUserRequest(BaseModel):
    username: str
    password: str
    display_name: str = ""


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(
        select(User).where(User.username == body.username, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
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
    body: RegisterUserRequest,
    admin: dict = Depends(require_admin), db: AsyncSession = Depends(get_db),
):
    """管理员注册新用户"""
    # 检查用户名是否已存在
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少6位")

    user = User(
        username=body.username,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.username,
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
async def init_admin(db):
    """首次启动时创建默认管理员（异步版本）"""
    result = await db.execute(select(User).where(User.role == "admin"))
    if not result.scalar_one_or_none():
        admin = User(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="系统管理员",
            role="admin",
        )
        db.add(admin)


def init_admin_sync(db):
    """首次启动时创建默认管理员（同步版本，用于 SQLite 模式）"""
    from app.models import User as UserModel
    result = db.execute(select(UserModel).where(UserModel.role == "admin"))
    if not result.scalar_one_or_none():
        admin = UserModel(
            username="admin",
            password_hash=hash_password("admin123"),
            display_name="系统管理员",
            role="admin",
        )
        db.add(admin)


# ===== OAuth 平台授权 =====

@router.get("/oauth/authorize")
async def oauth_authorize(platform: str, request: Request):
    """发起 OAuth 授权"""
    if platform not in OAUTH_CONFIG:
        raise HTTPException(400, detail="不支持的平台")

    cfg = OAUTH_CONFIG[platform]
    state = secrets.token_urlsafe(32)
    oauth_states[state] = platform

    token = request.cookies.get("auth_token")
    if token:
        payload = decode_access_token(token)
        if payload:
            oauth_states[state] = f"{platform}:{payload['user_id']}"

    if DEV_MODE:
        # 开发模式：使用本地模拟授权页面
        return RedirectResponse(
            url=f"http://localhost:8000/api/auth/oauth/demo-page?platform={platform}&state={state}"
        )

    # 生产模式：跳转到真实平台 OAuth
    redirect_uri = "http://localhost:8000/api/auth/oauth/callback"
    auth_url = (
        f"{cfg['authorize_url']}"
        f"?client_id={cfg['client_id']}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={cfg['scope']}"
        f"&state={state}"
    )
    return RedirectResponse(url=auth_url)


@router.get("/oauth/demo-page")
async def oauth_demo_page(platform: str, state: str):
    """开发模式模拟授权页面"""
    from fastapi.responses import HTMLResponse
    cfg = OAUTH_CONFIG.get(platform, {"name": platform})

    return HTMLResponse(f"""<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>授权 {cfg['name']}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:Inter,system-ui,sans-serif;background:#0A0A0F;color:#F0F0F5;display:flex;align-items:center;justify-content:center;min-height:100vh}}
.card{{background:#14141F;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;max-width:420px;text-align:center}}
h1{{font-size:20px;margin-bottom:12px}}
p{{color:#8888A0;font-size:14px;line-height:1.6;margin-bottom:24px}}
.btn{{display:inline-block;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;transition:all .15s;margin:6px}}
.btn-auth{{background:linear-gradient(135deg,#6C5CE7,#00D2FF);color:#fff;box-shadow:0 0 20px rgba(108,92,231,0.3)}}
.btn-auth:hover{{box-shadow:0 0 30px rgba(108,92,231,0.5)}}
.btn-cancel{{background:transparent;border:1px solid rgba(255,255,255,0.1);color:#8888A0}}
.badge{{display:inline-block;padding:4px 12px;border-radius:6px;font-size:12px;background:rgba(108,92,231,0.2);color:#8B7FEE;margin-bottom:16px}}
</style></head>
<body>
<div class="card">
<div class="badge">🔧 开发模式</div>
<h1>🔐 授权 {cfg['name']} 账号</h1>
<p>这是本地开发模拟授权页面。<br>点击「授权」后，平台将通过你的 {cfg['name']} 账号调用大模型。<br><br>生产环境中，此页面由 {cfg['name']} 官方提供，<br>你将在这里输入自己的 {cfg['name']} 账号密码完成授权。</p>
<a href="/api/auth/oauth/callback?code=demo_token_{platform}&state={state}" class="btn btn-auth">✅ 授权并继续</a>
<a href="http://localhost:3000/settings" class="btn btn-cancel">取消</a>
</div>
</body></html>""")


@router.get("/oauth/callback")
async def oauth_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    """OAuth 回调：用授权码交换 access_token 并保存"""
    if state not in oauth_states:
        raise HTTPException(400, detail="无效的 state")

    saved = oauth_states.pop(state)
    platform = saved if ":" not in saved else saved.split(":")[0]
    user_id = None if ":" not in saved else int(saved.split(":")[1])

    if platform not in OAUTH_CONFIG:
        raise HTTPException(400, detail="不支持的平台")

    cfg = OAUTH_CONFIG[platform]

    # 用授权码交换 access_token
    async with httpx.AsyncClient() as client:
        try:
            token_resp = await client.post(
                cfg["token_url"],
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": cfg["client_id"],
                    "redirect_uri": "http://localhost:8000/api/auth/oauth/callback",
                },
                timeout=30.0,
            )
            token_data = token_resp.json()
            access_token = token_data.get("access_token", "")
        except Exception:
            # 演示模式：如果无法连接真实平台，用 code 作为临时 token
            access_token = code

    if not access_token:
        raise HTTPException(400, detail="获取授权令牌失败")

    # 保存授权令牌到用户 AI 配置
    if user_id:
        result = await db.execute(
            select(UserAIConfig).where(
                UserAIConfig.user_id == user_id,
                UserAIConfig.platform == platform,
            )
        )
        config = result.scalar_one_or_none()

        encrypted = encrypt_token(access_token)
        if config:
            config.api_token_encrypted = encrypted
            config.is_active = True
        else:
            old_result = await db.execute(
                select(UserAIConfig).where(
                    UserAIConfig.user_id == user_id, UserAIConfig.is_active == True
                )
            )
            for old in old_result.scalars():
                old.is_active = False
            config = UserAIConfig(
                user_id=user_id, platform=platform,
                api_token_encrypted=encrypted, is_active=True,
            )
            db.add(config)

    return RedirectResponse(url="http://localhost:3000/settings?auth=success")
