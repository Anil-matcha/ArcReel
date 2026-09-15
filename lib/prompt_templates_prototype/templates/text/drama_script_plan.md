---
id: text/drama_script_plan
category: text
title: 剧情演绎 · 脚本规划
description: 把小说或剧本源文拆为结构化分镜内容（视觉改编描述、逐字口播 utterances、原文锚 source_text），供 generate_script_plan 的剧情变体调用。
applies_to:
  content_modes: [drama]
  generation_modes: [storyboard]
  source_kinds: [novel, screenplay]
slots:
  source_kind: 源文类型轴值（novel / screenplay），用于解析命名变体片段与源文标签
  target_language: 输出语言（自然语言字符串值所用语言）
  project_overview: 项目概述，键齐全的对象 {synopsis, genre, theme, world_setting}
  style: 项目风格值
  character_names: 可写进引用字段的角色名列表（本体在前、衍生紧随，形如 本体/衍生）
  scene_names: 可写进引用字段的场景名列表
  prop_names: 可写进引用字段的道具名列表
  novel_text: 本集源文正文
  episode: 集号
  durations: 模型支持的秒数档位，逗号分隔文本（如 "4, 6, 8"）
  max_duration: 最长档位（秒）
  default_duration: 单场默认秒数；无默认时传 null
  speech_rate: 口播语速（阅读单位 / 秒），已格式化为文本
  speech_unit: 阅读单位量词（字 / 词）
  episode_target_duration: 单集目标时长（秒）；未设置时传 null
  episode_outline: 本集大纲，键齐全的对象 {title, story_beats, hook, next_episode_teaser}；无规划时传 null
  next_episode_outline: 下集大纲，形状同上；无规划时传 null
  instructions: 附加指令正文；无时传 null
protected: false
---
{{ variant("script_plan_task", source_kind) }}

**输出语言**：{{ variant("script_plan_language_rule", source_kind) }}
**结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。

{{ partial("pacing/drama") }}

## 项目信息

<overview>
{{ project_overview.synopsis }}

题材类型：{{ project_overview.genre }}
核心主题：{{ project_overview.theme }}
世界观设定：{{ project_overview.world_setting }}
</overview>

<style>
{{ style }}
</style>

<characters>
{{ partial("asset_name_bullets", names=character_names) }}
</characters>

<scenes>
{{ partial("asset_name_bullets", names=scene_names) }}
</scenes>

<props>
{{ partial("asset_name_bullets", names=prop_names) }}
</props>

## {{ variant("script_plan_source_heading", source_kind) }}

<{{ source_kind }}>
{{ novel_text }}
</{{ source_kind }}>

{% if episode_outline %}
<episode_outline>
本集大纲（分集规划设计，剧本内容应覆盖全部故事节点）：
{% if episode_outline.title %}
本集标题：{{ episode_outline.title }}
{% endif %}
{{ partial("episode_outline_lines", outline=episode_outline) }}
</episode_outline>

{% if episode_outline.hook or episode_outline.next_episode_teaser %}
{{ partial("hook_landing_guide") }}

{% endif %}
{% endif %}
{% if next_episode_outline %}
<next_episode_outline>
下集大纲（仅用于设计本集结尾的衔接，不要把下集情节提前写进本集）：
{% if next_episode_outline.title %}
下集标题：{{ next_episode_outline.title }}
{% endif %}
{{ partial("episode_outline_lines", outline=next_episode_outline) }}
</next_episode_outline>

{% endif %}
# 字段写作指引

把源文拆为有序分镜，逐条产出结构化分镜内容。当前正在生成第 {{ episode }} 集。

## 基础字段

- **scene_id**：`E{{ episode }}S{两位序号}` 格式（如 E{{ episode }}S01），按分镜顺序递增，不得用其他集号前缀。
- **duration_seconds**：{{ partial("script_plan_duration_tiers") }}。{{ partial("script_plan_speech_lower_bound") }}{% if episode_target_duration %}。{{ partial("episode_target_duration_rule") }}{% endif %}。{{ variant("script_plan_break_rule", source_kind) }}
- **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
  - 候选 characters：[{{ partial("asset_name_candidates", names=character_names) }}]
  - 候选 scenes：[{{ partial("asset_name_candidates", names=scene_names) }}]
  - 候选 props：[{{ partial("asset_name_candidates", names=prop_names) }}]
  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
- **scene_description**：{{ variant("script_plan_scene_rule", source_kind) }}

## 逐字内容（内容真相源，定稿后原样保留、不再改写）

- **source_text**：{{ partial("script_plan_source_text_guide") }}
- **utterances**：{{ variant("script_plan_utterances_rule", source_kind) }}

每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。
{% if instructions %}


# 附加指令
{{ instructions -}}
{% endif %}
