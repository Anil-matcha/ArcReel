"""PROTOTYPE（issue #2460）——缺槽位 / 多余槽位 / 未知片段等错误的报错时机与信息样例。

运行：``uv run python lib/prompt_templates_prototype/error_samples.py``

每个样例打印：触发方式、报错时机（加载期 = 构造 ``PromptTemplates`` 时；渲染期 = 调用 ``render`` 时）、
异常类型与完整信息。带「对照」的样例展示只靠 Jinja（绕过模块预检）会发生什么。
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from lib.prompt_templates_prototype.engine import PromptTemplates
from lib.prompt_templates_prototype.render_check import SCRIPT_PLAN_BASE, slots_for_script_plan

HERE = Path(__file__).parent
GOOD = PromptTemplates(HERE / "templates")
GOOD_SLOTS = slots_for_script_plan(**SCRIPT_PLAN_BASE)


def _show(title: str, timing: str, action: Callable[[], object]) -> None:
    print(f"\n### {title}\n报错时机：{timing}")
    try:
        result = action()
    except Exception as exc:
        print(f"异常：{type(exc).__module__}.{type(exc).__name__}\n信息：{exc}")
    else:
        preview = str(result).replace("\n", "⏎")[:120]
        print(f"（未报错）返回：{preview}…")


def main() -> None:
    print("# 一、缺槽位")
    _show(
        "1a 调用方漏传 instructions 与 episode_target_duration（模块预检）",
        "渲染期，进入 Jinja 之前；一次列出全部缺失槽位",
        lambda: GOOD.render(
            "text/drama_script_plan",
            **{k: v for k, v in GOOD_SLOTS.items() if k not in {"instructions", "episode_target_duration"}},
        ),
    )
    _show(
        "1b 对照：绕过预检、只靠 StrictUndefined 拦 speech_unit（片段内引用）",
        "渲染期，执行到该表达式时才抛；一次只报一个，且信息不带模版 / 片段名",
        lambda: GOOD.render_unchecked(
            "text/drama_script_plan", **{k: v for k, v in GOOD_SLOTS.items() if k != "speech_unit"}
        ),
    )
    _show(
        "1c 对照：绕过预检、漏传 instructions（只在真值条件里出现）",
        "渲染期，`{% if instructions %}` 对 Undefined 取布尔值时抛（StrictUndefined 连布尔测试都拦）",
        lambda: GOOD.render_unchecked(
            "text/drama_script_plan", **{k: v for k, v in GOOD_SLOTS.items() if k != "instructions"}
        ),
    )
    _show(
        "1d 嵌套槽位缺键：episode_outline 只有 title，没有 story_beats / hook 键",
        "渲染期，片段里第一次取缺失键（story_beats）时抛；槽位值须是键齐全的投影（render_check 的 _full_shape 即为此而设）",
        lambda: GOOD.render("text/drama_script_plan", **{**GOOD_SLOTS, "episode_outline": {"title": "只有标题"}}),
    )

    print("\n# 二、多余槽位")
    _show(
        "2a 调用方多传了 style_description（模块预检）",
        "渲染期，进入 Jinja 之前",
        lambda: GOOD.render("text/drama_script_plan", **GOOD_SLOTS, style_description="多余"),
    )
    _show(
        "2b 对照：绕过预检、只靠 Jinja",
        "不报错——Jinja 静默忽略上下文里多余的变量，多余槽位只能由模块拦",
        lambda: GOOD.render_unchecked("text/drama_script_plan", **GOOD_SLOTS, style_description="多余"),
    )

    print("\n# 三、未知片段")
    _show(
        '3a 固定片段名不存在：partial("nope")',
        "加载期（构造注册表时静态扫描），整个目录拒绝加载",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "unknown_partial"),
    )
    _show(
        '3b 变体片段族拼错：variant("script_plan_tsak", …)（族目录不存在）',
        "加载期；族目录不存在或为空即报错",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "unknown_variant_family"),
    )
    _show(
        '3c 对照：族存在但该轴值无文件——variant("text/drama_script_plan/task", "bogus")',
        "不报错——按 Spec「不存在的变体即为空」渲染为空串；调用方回落未知 source_kind 到 novel 是槽位值生产者的事",
        lambda: repr(GOOD.env.from_string('{{ variant("text/drama_script_plan/task", "bogus") }}').render()),
    )
    _show(
        "3d 渲染期兜底：片段名由表达式动态拼出、静态扫描扫不到时",
        "渲染期；正则只扫字面量片段名，动态拼名只能靠渲染期兜底",
        lambda: GOOD.env.from_string('{{ partial("no" ~ "pe") }}').render(),
    )

    print("\n# 四、其他 fail-loud（加载期）")
    _show(
        "4a 正文引用未声明的槽位 target_language",
        "加载期（find_undeclared_variables 静态分析）",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "undeclared_slot_in_body"),
    )
    _show(
        "4b 片段引用未声明的槽位（正文本身干净）",
        "加载期；静态扫描沿 partial / variant 引用递归进片段",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "undeclared_slot_in_partial"),
    )
    _show(
        "4c 使用白名单外的过滤器 upper",
        "加载期（编译）",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "filter_not_whitelisted"),
    )
    _show(
        "4d 重复模版 id",
        "加载期",
        lambda: PromptTemplates(HERE / "fixtures_bad" / "duplicate_id"),
    )

    print("\n# 五、沙箱（渲染期）")
    bad = PromptTemplates(HERE / "fixtures_bad" / "sandbox_escape")
    _show(
        "5a 模版访问 style.__class__.__mro__",
        "渲染期；加载期静态分析看不出属性访问是否越权",
        lambda: bad.render("text/bad", style="x"),
    )
    _show(
        "5b 沙箱默认全局（range / lipsum / cycler …）已清空",
        "渲染期；StrictUndefined 把 range 当未定义变量",
        lambda: GOOD.env.from_string("{{ range(3) }}").render(),
    )


if __name__ == "__main__":
    main()
