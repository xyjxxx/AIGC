"""应用配置管理"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 开发模式：SQLite 替代 MySQL（无需 Docker）
    use_sqlite: bool = True

    # 数据库（MySQL 模式）
    db_host: str = "localhost"
    db_port: int = 3306
    db_user: str = "shipin_user"
    db_password: str = "shipin_pass_2024"
    db_name: str = "shipin_gongfang"

    # Redis（SQLite 模式下可忽略）
    redis_host: str = "localhost"
    redis_port: int = 6379

    # API Key 加密
    encryption_key: str = "change-me-in-production-32bytes!"

    # 存储路径
    storage_upload_path: str = "../storage/uploads"
    storage_output_path: str = "../storage/outputs"

    # JWT
    jwt_secret: str = "shipin-gongfang-jwt-secret-2024"

    # AI 平台默认配置
    openai_base_url: str = "https://api.openai.com/v1"
    doubao_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"

    @property
    def database_url(self) -> str:
        if self.use_sqlite:
            return "sqlite+aiosqlite:///./shipin.db"
        return f"mysql+aiomysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
