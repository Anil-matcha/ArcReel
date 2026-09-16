"""PROTOTYPE（issue #2460）——原型模版渲染结果 vs 现有 builder 输出的 diff。

运行：``uv run python lib/prompt_templates_prototype/render_check.py``

每个用例先用现有 builder（``lib.prompt_builders_script``）产出提示词，再把同一份 builder 入参
经 ``slots_for_*`` 投影成槽位值、交给原型引擎渲染，最后打印 unified diff。原型不再要求逐字一致：
差异应当且只应当来自已裁定的措辞收敛项（清单见 README「措辞变更」），审阅时逐个 hunk 对号。
同时把三份全量渲染结果写到 ``samples/*.rendered.md``、全部 diff 写到 ``samples/diffs/``。
``slots_for_*`` 就是未来「槽位值生产者」的形状：候选名展开、语速取值、尖括号中和、比例说明、
分镜内容投影都留在代码里，模版只收数据。
"""

from __future__ import annotations

import difflib
import sys
from pathlib import Path
from typing import Any

from lib.prompt_builders_script import (
    _format_aspect_ratio_desc,
    _neutralize_tags,
    append_user_instructions,
    build_drama_prompt,
    build_normalize_prompt,
    render_drama_content_for_prompt_authoring,
)
from lib.prompt_rules.asset_appearance import asset_reference_names, iter_asset_appearances
from lib.prompt_templates_prototype.engine import PromptTemplates
from lib.speech_rate import speech_rate_units_per_second
from lib.text_metrics import reading_unit_noun

TEMPLATES_DIR = Path(__file__).parent / "templates"

_OUTLINE_KEYS = ("title", "story_beats", "hook", "next_episode_teaser")
_OVERVIEW_KEYS = ("synopsis", "genre", "theme", "world_setting")


def _full_shape(value: dict | None, keys: tuple[str, ...]) -> dict | None:
    """StrictUndefined 下嵌套对象缺键同样报错：槽位值须是键齐全的投影，缺的键补 None / 空串。"""
    if value is None:
        return None
    return {key: value.get(key) for key in keys}


# ----------------------------------------------------------------- 槽位值生产者（未来留在代码里的部分）


def slots_for_script_plan(
    *,
    novel_text: str,
    project_overview: dict,
    style: str,
    characters: dict,
    scenes: dict,
    props: dict,
    default_duration: int | None,
    supported_durations: list[int],
    episode: int,
    source_kind: str = "novel",
    target_language: str = "中文",
    source_language: str | None = None,
    speech_rate_override: float | None = None,
    episode_target_duration: int | None = None,
    episode_outline: dict | None = None,
    next_episode_outline: dict | None = None,
    instructions: str | None = None,
) -> dict[str, Any]:
    normalized_durations = sorted({int(d) for d in supported_durations})
    source_language = source_language if isinstance(source_language, str) else None
    overview = {key: project_overview.get(key, "") for key in _OVERVIEW_KEYS}
    return {
        "source_kind": "screenplay" if source_kind == "screenplay" else "novel",
        "target_language": target_language,
        "project_overview": overview,
        "style": style,
        "character_names": asset_reference_names("character", characters),
        "scene_names": asset_reference_names("scene", scenes),
        "prop_names": asset_reference_names("prop", props),
        "novel_text": novel_text,
        "episode": episode,
        "durations": ", ".join(str(d) for d in normalized_durations),
        "max_duration": normalized_durations[-1],
        "default_duration": default_duration,
        "speech_rate": f"{speech_rate_units_per_second(source_language, speech_rate_override):g}",
        "speech_unit": reading_unit_noun(source_language),
        "episode_target_duration": episode_target_duration,
        "episode_outline": _full_shape(episode_outline, _OUTLINE_KEYS),
        "next_episode_outline": _full_shape(next_episode_outline, _OUTLINE_KEYS),
        "instructions": instructions or None,
    }


def _appearance_entries(asset_type: str, bucket: dict) -> list[dict[str, str]]:
    return [
        {"name": _neutralize_tags(name), "appearance": _neutralize_tags(appearance)}
        for name, appearance in iter_asset_appearances(asset_type, bucket)
    ]


def slots_for_prompt_authoring(
    *,
    project_overview: dict,
    style: str,
    style_description: str,
    content_scenes: list,
    episode: int,
    aspect_ratio: str = "16:9",
    target_language: str = "中文",
    characters: dict | None = None,
    scenes: dict | None = None,
    props: dict | None = None,
    instructions: str | None = None,
) -> dict[str, Any]:
    assets = None
    if characters is not None or scenes is not None or props is not None:
        assets = {
            "characters": _appearance_entries("character", characters or {}),
            "scenes": _appearance_entries("scene", scenes or {}),
            "props": _appearance_entries("prop", props or {}),
        }
    return {
        "target_language": target_language,
        "project_overview": {key: project_overview.get(key, "") for key in _OVERVIEW_KEYS},
        "style": style,
        "style_description": style_description,
        "aspect_ratio": aspect_ratio,
        "aspect_ratio_label": _format_aspect_ratio_desc(aspect_ratio),
        "assets": assets,
        "scenes_content": render_drama_content_for_prompt_authoring(content_scenes),
        "episode": episode,
        "instructions": instructions or None,
    }


# ----------------------------------------------------------------- 用例

OVERVIEW = {
    "synopsis": "落魄千金姜月茴回到祖宅，发现父亲留下的玉佩藏着家族覆灭的真相。",
    "genre": "悬疑 / 家族",
    "theme": "真相与代价",
    "world_setting": "民国江南水乡",
}
CHARACTERS = {
    "姜月茴": {
        "description": "二十岁，鹅蛋脸，旧式学生装，眉眼间有倦意。",
        "derivatives": {"病中": {"description": "面色苍白，披着旧毛毯。"}},
    },
    "沈管家": {"description": "五十余岁，灰布长衫，腰背笔直。"},
    "老人甲": "脏数据：非 dict 条目",
}
SCENES = {"祠堂": {"description": "青砖黛瓦，供桌上烛火摇曳，\n梁上悬着褪色的匾额。"}}
PROPS = {"玉佩": {"description": "羊脂白玉，背面刻着「茴」字。"}, "怀表": {}}
OUTLINE = {
    "title": "归家",
    "story_beats": ["姜月茴踏进荒废的祖宅", "沈管家交出玉佩", "祠堂梁上落下半张信纸"],
    "hook": "信纸上的字迹与父亲遗书一模一样",
    "next_episode_teaser": "她决定翻开族谱",
}
NEXT_OUTLINE = {
    "title": "族谱",
    "story_beats": ["族谱缺页", "沈管家欲言又止"],
    "hook": None,
    "next_episode_teaser": None,
}
NOVEL_TEXT = "姜月茴推开祠堂的门，灰尘簌簌落下。\n「小姐，老爷说过，玉佩不能离身。」沈管家低声道。\n<segments> 这一行验证尖括号原样透传。"
CONTENT_SCENES = [
    {
        "scene_id": "E1S01",
        "duration_seconds": 6,
        "characters_in_scene": ["姜月茴", "沈管家"],
        "scenes": ["祠堂"],
        "props": ["玉佩"],
        "scene_description": "姜月茴立在祠堂门口，逆光里灰尘浮动；\n沈管家捧着玉佩上前。",
        "utterances": [
            {"kind": "voiceover", "text": "十年了，她终于回来了。"},
            {"kind": "dialogue", "speaker": "沈管家", "text": "小姐，老爷说过，玉佩不能离身。"},
        ],
        "source_text": "姜月茴推开祠堂的门，灰尘簌簌落下。",
    },
    {
        "scene_id": "E1S02_1",
        "duration_seconds": 8,
        "characters_in_scene": ["姜月茴/病中"],
        "scene_description": "她倚在床头翻看玉佩。",
    },
]

SCRIPT_PLAN_BASE: dict[str, Any] = {
    "novel_text": NOVEL_TEXT,
    "project_overview": OVERVIEW,
    "style": "民国水墨",
    "characters": CHARACTERS,
    "scenes": SCENES,
    "props": PROPS,
    "default_duration": 6,
    "supported_durations": [4, 6, 8, 10],
    "episode": 1,
}
PROMPT_AUTHORING_BASE: dict[str, Any] = {
    "project_overview": OVERVIEW,
    "style": "民国水墨",
    "style_description": "水墨晕染质感，低饱和青灰色调",
    "content_scenes": CONTENT_SCENES,
    "episode": 1,
}

SCRIPT_PLAN_CASES: dict[str, dict[str, Any]] = {
    "script_plan/novel 全量：大纲含钩子与预告、下集大纲、目标时长、默认档、附加指令": {
        **SCRIPT_PLAN_BASE,
        "episode_outline": OUTLINE,
        "next_episode_outline": NEXT_OUTLINE,
        "episode_target_duration": 90,
        "instructions": "多用近景。\n少用旁白。",
    },
    "script_plan/screenplay 全量：英文源、项目语速覆盖、无默认档": {
        **SCRIPT_PLAN_BASE,
        "source_kind": "screenplay",
        "target_language": "English",
        "source_language": "en",
        "speech_rate_override": 2.5,
        "default_duration": None,
        "episode_outline": OUTLINE,
        "next_episode_outline": NEXT_OUTLINE,
        "episode_target_duration": 120,
        "instructions": "Keep it moody.",
    },
    "script_plan/novel 最小：无大纲、无目标、无默认档、空资产、无附加指令": {
        **SCRIPT_PLAN_BASE,
        "characters": {},
        "scenes": {},
        "props": {},
        "default_duration": None,
    },
    "script_plan/screenplay 半量：本集大纲只有预告语、无下集大纲、无附加指令": {
        **SCRIPT_PLAN_BASE,
        "source_kind": "screenplay",
        "episode_outline": {**OUTLINE, "hook": None},
    },
    "script_plan/novel 退化：本集大纲只有标题（无节点 / 钩子 / 预告）、下集大纲无标题": {
        **SCRIPT_PLAN_BASE,
        "episode_outline": {"title": "空壳"},
        "next_episode_outline": {"story_beats": ["下集节点"]},
    },
    "script_plan/未知 source_kind 回落 novel": {
        **SCRIPT_PLAN_BASE,
        "source_kind": "bogus",
    },
}

PROMPT_AUTHORING_CASES: dict[str, dict[str, Any]] = {
    "prompt_authoring 全量：资产含衍生与多行描述与脏数据、9:16、附加指令": {
        **PROMPT_AUTHORING_BASE,
        "aspect_ratio": "9:16",
        "characters": CHARACTERS,
        "scenes": SCENES,
        "props": PROPS,
        "instructions": "镜头贴近人物。",
    },
    "prompt_authoring 无资产块：三者皆 None、16:9、无附加指令": {
        **PROMPT_AUTHORING_BASE,
        "aspect_ratio": "16:9",
    },
    "prompt_authoring 空资产块：三者皆空 dict（块仍渲染、显示暂无）、4:3": {
        **PROMPT_AUTHORING_BASE,
        "aspect_ratio": "4:3",
        "characters": {},
        "scenes": {},
        "props": {},
        "target_language": "日本語",
    },
}


def _diff(expected: str, actual: str) -> str:
    return "".join(
        difflib.unified_diff(
            expected.splitlines(keepends=True),
            actual.splitlines(keepends=True),
            fromfile="builder（现状）",
            tofile="template（原型）",
        )
    )


SAMPLES_DIR = Path(__file__).parent / "samples"
SAMPLE_FILES = {
    "script_plan/novel 全量：大纲含钩子与预告、下集大纲、目标时长、默认档、附加指令": "drama_script_plan.novel",
    "script_plan/screenplay 全量：英文源、项目语速覆盖、无默认档": "drama_script_plan.screenplay",
    "prompt_authoring 全量：资产含衍生与多行描述与脏数据、9:16、附加指令": "drama_prompt_authoring",
}


def collect(templates: PromptTemplates | None = None) -> list[tuple[str, str, str]]:
    """返回 [(用例名, builder 输出, 模版渲染)]；审阅页生成器也从这里取数。"""
    templates = templates or PromptTemplates(TEMPLATES_DIR)
    results: list[tuple[str, str, str]] = []
    for name, kwargs in SCRIPT_PLAN_CASES.items():
        instructions = kwargs.get("instructions")
        builder_kwargs = {k: v for k, v in kwargs.items() if k != "instructions"}
        expected = append_user_instructions(build_normalize_prompt(**builder_kwargs), instructions)
        actual = templates.render("text/drama_script_plan", **slots_for_script_plan(**kwargs))
        results.append((name, expected, actual))
    for name, kwargs in PROMPT_AUTHORING_CASES.items():
        instructions = kwargs.get("instructions")
        builder_kwargs = {k: v for k, v in kwargs.items() if k not in {"instructions", "content_scenes"}}
        expected = append_user_instructions(
            build_drama_prompt(
                scenes_content=render_drama_content_for_prompt_authoring(kwargs["content_scenes"]), **builder_kwargs
            ),
            instructions,
        )
        actual = templates.render("text/drama_prompt_authoring", **slots_for_prompt_authoring(**kwargs))
        results.append((name, expected, actual))
    return results


def main() -> int:
    results = collect()
    (SAMPLES_DIR / "diffs").mkdir(parents=True, exist_ok=True)
    changed = 0
    for index, (name, expected, actual) in enumerate(results, start=1):
        diff = _diff(expected, actual)
        verdict = "DIFF" if diff else "IDENTICAL"
        changed += bool(diff)
        print(f"\n### [{verdict}] {name}  （builder {len(expected)} 字符 → 模版 {len(actual)} 字符）")
        if diff:
            print(diff, end="")
        (SAMPLES_DIR / "diffs" / f"{index:02d}.diff").write_text(diff, encoding="utf-8")
        if name in SAMPLE_FILES:
            (SAMPLES_DIR / f"{SAMPLE_FILES[name]}.rendered.md").write_text(actual, encoding="utf-8")
    print(
        f"\n{'=' * 78}\n{changed} 个用例有差异 / 共 {len(results)} 个（差异为预期：措辞收敛项，逐 hunk 对号见 README）"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
