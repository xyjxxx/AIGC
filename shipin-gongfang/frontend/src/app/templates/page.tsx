"use client";

import Link from "next/link";

const TEMPLATES = [
  { name: "口播种草型", icon: "🎙️", desc: "达人视角 → 真实体验 → 推荐理由", category: "全品类适用", usage: "1.2k 使用", features: ["黄金3秒开场", "真实体验话术", "信任感建立", "软性促单"] },
  { name: "痛点解决型", icon: "💡", desc: "展现痛点 → 产品登场 → 问题解决", category: "家居/个护/工具", usage: "980 使用", features: ["痛点共鸣开场", "产品对比展示", "效果放大", "限时紧迫感"] },
  { name: "测评对比型", icon: "📊", desc: "AB对比 → 实测数据 → 结果反转", category: "数码/美妆/食品", usage: "890 使用", features: ["专业测评调性", "数据可视化", "对比分镜", "结论强化"] },
  { name: "场景种草型", icon: "🌿", desc: "氛围场景 → 产品融入 → 心动种草", category: "服饰/香薰/零食", usage: "650 使用", features: ["氛围感画面", "生活方式植入", "色调滤镜", "情感共鸣"] },
  { name: "使用教程型", icon: "📖", desc: "开箱 → 步骤演示 → 效果展示", category: "小家电/配饰/DIY", usage: "540 使用", features: ["步骤化分镜", "特写强调细节", "注意事项", "效果对比"] },
  { name: "促销快闪型", icon: "⚡", desc: "快节奏 → 价格优势 → 紧迫感", category: "大促/清仓/爆品", usage: "420 使用", features: ["快节奏剪辑", "价格大字强调", "倒计时元素", "强行动号召"] },
];

export default function TemplatesPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="btn-ghost text-sm">← 返回</Link>
        <h1 className="text-xl font-semibold">模板库</h1>
      </div>

      <p className="text-[#8888A0] mb-6">
        选择合适的视频模板，AI 将根据模板风格自动生成脚本和分镜。每种模板都针对特定品类和平台优化。
      </p>

      <div className="grid grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="glass-card hover:border-[#6C5CE7]/30 transition-all cursor-pointer group">
            <div className="text-3xl mb-3">{t.icon}</div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-base">{t.name}</h3>
              <span className="tag-purple text-xs">{t.category}</span>
            </div>
            <p className="text-sm text-[#8888A0] mb-4">{t.desc}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {t.features.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 rounded bg-white/[0.04] text-[#8888A0]">{f}</span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#555568]">{t.usage}</span>
              <button className="btn-ai text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                使用模板 →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
