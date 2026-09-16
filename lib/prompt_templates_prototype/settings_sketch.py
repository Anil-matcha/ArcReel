"""PROTOTYPE（issue #2460）——用真实元数据画出「系统设置 › 提示词模版」分栏的文本草图。

运行：``uv run python lib/prompt_templates_prototype/settings_sketch.py``

列表视图来自 ``list_templates``，详情视图来自 ``read_source``——两者就是 Spec 里 REST 只读两条
（列表 = 元数据、详情 = 源文 + 槽位 + 片段清单）的形状。
"""

from __future__ import annotations

import importlib
from pathlib import Path
from typing import Any

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
    if template_meta.output_schema:
        print(f"│ 输出结构（response_schema：{template_meta.output_schema}，折叠；枚举值只在这里可见）")
        for line in _schema_lines(template_meta.output_schema):
            print(f"│   {line}")
        print("│")
    print("│ 源文（槽位与片段引用以标记呈现，页面上可展开片段正文）")
    print("│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄")
    for line in body.splitlines()[:12]:
        print(f"│ {line}")
    print("│ ……")
    print("└──────────────────────────────────────────────────────────────────────┘")

    other_id = "text/drama_prompt_authoring"
    other_meta = next(m for m in templates.list_templates() if m.id == other_id)
    print()
    print("┌─ 模版详情（节选：只看输出结构） ───────────────────────────────────────┐")
    print(f"│ {other_meta.title}")
    print(f"│ 输出结构（response_schema：{other_meta.output_schema}）——shot_type / camera_motion 的枚举值只在这里")
    for line in _schema_lines(other_meta.output_schema or ""):
        print(f"│   {line}")
    print("└──────────────────────────────────────────────────────────────────────┘")


def _schema_lines(spec: str) -> list[str]:
    """把 ``module:Class`` 的 JSON schema 摊平成「字段路径  类型 / 枚举  说明」行——设置页「输出结构」块的最小形态。"""
    module_name, class_name = spec.split(":")
    model = getattr(importlib.import_module(module_name), class_name)
    schema = model.model_json_schema()
    defs = schema.get("$defs", {})
    lines: list[str] = []

    def walk(node: dict[str, Any], prefix: str) -> None:
        for name, prop in node.get("properties", {}).items():
            path = f"{prefix}{name}"
            resolved, hint = _resolve(prop, defs)
            description = " ".join((prop.get("description") or resolved.get("description") or "").split())
            lines.append(f"{path:<40} {hint:<28} {description}")
            child = resolved if "properties" in resolved else None
            if child is None and resolved.get("type") == "array":
                items, _ = _resolve(resolved.get("items", {}), defs)
                child = items if "properties" in items else None
                path += "[]"
            if child is not None:
                walk(child, f"{path}.")

    walk(schema, "")
    return lines


def _resolve(prop: dict[str, Any], defs: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """解开 $ref / anyOf，返回 (目标节点, 类型或枚举提示)。"""
    if "$ref" in prop:
        target = defs[prop["$ref"].rsplit("/", 1)[-1]]
        return target, "enum " + "/".join(target["enum"]) if "enum" in target else target.get("type", "object")
    if "anyOf" in prop:
        options = [_resolve(option, defs) for option in prop["anyOf"]]
        non_null = [(node, hint) for node, hint in options if node.get("type") != "null"]
        node, hint = non_null[0] if non_null else options[0]
        return node, f"{hint} | null" if len(non_null) < len(options) else hint
    if prop.get("type") == "array":
        _, hint = _resolve(prop.get("items", {}), defs)
        return prop, f"list[{hint}]"
    if "enum" in prop:
        return prop, "enum " + "/".join(prop["enum"])
    return prop, prop.get("type", "object")


if __name__ == "__main__":
    main()
