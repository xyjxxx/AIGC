"""AI 平台代理层 — 统一路由到 OpenAI Codex 或 字节豆包"""
import httpx
from typing import Optional, List, Dict, Any

from app.utils.crypto import decrypt_token


class AIProxy:
    """AI 代理：根据用户选择的平台，路由 API 调用"""

    def __init__(self, platform: str, encrypted_token: str):
        self.platform = platform  # 'openai' or 'doubao'
        self.api_token = decrypt_token(encrypted_token)

    def _headers(self) -> Dict[str, str]:
        if self.platform == "openai":
            return {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            }
        else:  # doubao
            return {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            }

    def _base_url(self) -> str:
        from app.config import settings
        return settings.openai_base_url if self.platform == "openai" else settings.doubao_base_url

    async def generate_script(
        self,
        product_name: str,
        product_features: str,
        template_type: str,
        target_platform: str,
        target_duration: int,
    ) -> List[Dict[str, Any]]:
        """
        生成带货脚本（3个版本）
        对应模块一：智能脚本生成
        """
        system_prompt = self._build_script_system_prompt(template_type, target_platform, target_duration)
        user_prompt = f"""请为以下商品生成3个不同风格的带货脚本版本：

商品名称：{product_name}
商品卖点：{product_features}
脚本模板：{template_type}
目标平台：{target_platform}
目标时长：约{target_duration}秒

请生成3个版本并返回JSON格式。每个版本需包含：title、segments（每个segment含type/ narration/ visualDescription/ durationEstimate）"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # 调用 AI API
        response = await self._call_chat(messages, temperature=0.8)
        return self._parse_script_response(response)

    async def generate_storyboard(self, script_text: str) -> List[Dict[str, Any]]:
        """
        将脚本自动拆解为分镜
        对应模块二：分镜画板
        """
        system_prompt = """你是一个专业的视频导演。请根据脚本将内容拆解为分镜序列。
每个分镜需包含：shotNumber(编号)、duration(时长秒数)、sceneType(景别:CLOSE_UP/MEDIUM/LONG/WIDE)、
cameraMovement(运镜:FIXED/PUSH/PULL/PAN/TILT/FOLLOW)、visualDescription(画面描述)、
narrationRef(对应口播)、transition(转场:CUT/DISSOLVE/SLIDE)。
请返回JSON数组格式。"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请为以下脚本生成分镜：\n{script_text}"},
        ]

        response = await self._call_chat(messages, temperature=0.6)
        return self._parse_json_response(response)

    async def generate_image_prompt(
        self, shot_description: str, style: str
    ) -> Dict[str, str]:
        """
        为分镜生成 AI 绘画提示词
        对应模块三：分镜图生成
        """
        messages = [
            {
                "role": "system",
                "content": f"""你是专业的AI绘画提示词专家。请将分镜描述转化为详细的{style}风格绘画提示词。
返回JSON: {{"prompt": "...", "negative_prompt": "..."}}
prompt需包含：主体、场景、镜头、灯光、画质关键词。用英文输出。""",
            },
            {"role": "user", "content": f"分镜描述：{shot_description}"},
        ]

        response = await self._call_chat(messages, temperature=0.7)
        return self._parse_json_response(response)

    async def optimize_video_script(
        self, script_text: str, action: str
    ) -> str:
        """
        视频AI优化：改写脚本段落
        action: more_interesting / more_professional / shorter / more_colloquial
        """
        action_map = {
            "more_interesting": "让这段文案更有趣、更有网感",
            "more_professional": "让这段文案更专业、更有说服力",
            "shorter": "精简这段文案，保持核心卖点",
            "more_colloquial": "让这段文案更口语化、更接地气",
        }
        instruction = action_map.get(action, "优化这段文案")

        messages = [
            {"role": "system", "content": "你是带货文案优化专家。"},
            {"role": "user", "content": f"{instruction}：\n{script_text}\n直接返回优化后的文案，不要加其他内容。"},
        ]

        response = await self._call_chat(messages, temperature=0.7)
        return response.strip()

    async def _call_chat(self, messages: List[Dict], temperature: float = 0.8) -> str:
        """调用聊天 API"""
        url = f"{self._base_url()}/chat/completions"
        model = "gpt-4o" if self.platform == "openai" else "doubao-pro-32k"

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                url,
                headers=self._headers(),
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": 4096,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _build_script_system_prompt(
        self, template_type: str, target_platform: str, target_duration: int
    ) -> str:
        """构建脚本生成的系统提示词"""
        platform_styles = {
            "抖音": "钩子开场+痛点/卖点展开+反转/惊喜+促单结尾",
            "快手": "接地气口语化+真实感+老铁文化+实惠感",
            "小红书": "精致种草风+图文感描述+品质感+生活方式",
            "视频号": "中产实用风+专业靠谱+温和推荐",
        }
        return f"""你是带货视频脚本创作专家。
当前任务：为{target_platform}平台创作{template_type}风格的带货脚本，时长约{target_duration}秒。
平台风格：{platform_styles.get(target_platform, '通用带货风格')}
请输出JSON格式。"""

    def _parse_script_response(self, response: str) -> List[Dict]:
        """解析脚本生成的 JSON 响应"""
        import json
        import re

        # 尝试提取 JSON
        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", response)
        if json_match:
            response = json_match.group(1)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            # 尝试找数组
            match = re.search(r"\[[\s\S]*\]", response)
            if match:
                return json.loads(match.group())
            return self._mock_script_response()

    def _parse_json_response(self, response: str) -> Dict:
        """解析 JSON 响应"""
        import json
        import re

        json_match = re.search(r"```json\s*([\s\S]*?)\s*```", response)
        if json_match:
            response = json_match.group(1)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            match = re.search(r"\{[\s\S]*\}", response)
            if match:
                return json.loads(match.group())
            return {"prompt": response, "negative_prompt": ""}

    def _mock_script_response(self) -> List[Dict]:
        """Mock 数据（API解析失败时的降级）"""
        return [
            {
                "version": "A",
                "title": "这个产品真的太好用了！",
                "segments": [
                    {"type": "opening", "narration": "你还在为这个问题烦恼吗？", "visualDescription": "问题场景展示", "durationEstimate": 3},
                    {"type": "body", "narration": "这款产品完美解决了这个痛点", "visualDescription": "产品特写展示", "durationEstimate": 10},
                    {"type": "closing", "narration": "赶紧点击下方链接购买吧！", "visualDescription": "购买引导画面", "durationEstimate": 5},
                ],
            }
        ]
