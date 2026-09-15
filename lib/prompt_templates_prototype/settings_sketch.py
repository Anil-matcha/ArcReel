"""PROTOTYPE（issue #2460）——用真实元数据画出「系统设置 › 提示词模版」分栏的文本草图。

运行：``uv run python lib/prompt_templates_prototype/settings_sketch.py``

列表视图来自 ``list_templates``，详情视图来自 ``read_source``——两者就是 Spec 里 REST 只读两条
（列表 = 元数据、详情 = 源文 + 槽位 + 片段清单）的形状。
"""

from __future__ import annotations

from pathlib import Path

from lib.prompt_templates_prototype.engine import PromptTemplates

CATEGORY_LABELS = {"text": "文本生成", "asset_image": "资产图", "storyboard_image": "分镜图", "video": "视频"}


def main() -> None:
    templates = PromptTemplates(Path(__file__).parent / "templates")

    print("┌─ 系统设置 › 提示词模版 ──────────────────────────────────────────┐")
    print("│ PROMPT TEMPLATES                                    （只读 · 随版本内置）│")
    by_category: dict[str, list] = {}
    for template_meta in templates.list_templates():
        by_category.setdefault(template_meta.category, []).append(template_meta)
    for category, items in by_category.items():
        print("│                                                                      │")
        print(f"│ {CATEGORY_LABELS.get(category, category)}")
        for template_meta in items:
            print(f"│   ▸ {template_meta.title:<22} {template_meta.description[:34]}…")
    print("└──────────────────────────────────────────────────────────────────────┘")

    template_id = "text/drama_script_plan"
    template_meta = next(m for m in templates.list_templates() if m.id == template_id)
    body, partials = templates.read_source(template_id)

    print()
    print("┌─ 模版详情 ───────────────────────────────────────────────────────────┐")
    print(f"│ {template_meta.title}")
    print(
        f"│ id: {template_meta.id}    类别: {CATEGORY_LABELS[template_meta.category]}    protected: {template_meta.protected}"
    )
    print(f"│ {template_meta.description}")
    print("│")
    print("│ 适用范围")
    for axis, values in template_meta.applies_to.items():
        print(f"│   {axis:<18} {', '.join(values)}")
    print("│")
    print(f"│ 槽位（{len(template_meta.slots)}）")
    for name, description in template_meta.slots.items():
        print(f"│   {{{{ {name} }}}}".ljust(34) + description)
    print("│")
    print(f"│ 引用的片段（{len(partials)}，按首次引用顺序；变体族展开为全部轴值）")
    for name, source in partials.items():
        first_line = source.strip().splitlines()[0] if source.strip() else "（空）"
        print(f"│   {name:<44} {first_line[:28]}…")
    print("│")
    print("│ 源文（槽位与片段引用以标记呈现，页面上可展开片段正文）")
    print("│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄")
    for line in body.splitlines()[:12]:
        print(f"│ {line}")
    print("│ ……")
    print("└──────────────────────────────────────────────────────────────────────┘")


if __name__ == "__main__":
    main()
