---
id: text/drama_prompt_authoring
category: text
title: 剧情演绎 · 提示词编写
description: 为 script_plan 已定稿的每个分镜补全视觉层（image_prompt / video_prompt），按 scene_id 逐条对齐。
applies_to:
  content_modes: [drama]
  generation_modes: [storyboard]
slots:
  target_language: 输出语言（自然语言字符串值所用语言）
  project_overview: 项目概述，键齐全的对象 {synopsis, genre, theme, world_setting}
  style: 项目风格值
  style_description: 项目风格描述
  aspect_ratio: 画面比例（如 16:9）
  aspect_ratio_label: 画面比例的文字说明（竖屏构图 / 横屏构图 / "<比例> 构图"），由代码按比例产出
  assets: 出场资产外观，对象 {characters, scenes, props}，每项是 [{name, appearance}] 列表（尖括号已中和）；调用方不提供资产块时传 null
  scenes_content: script_plan 已定稿分镜内容的渲染文本（由代码投影，含口播与原文锚）
  episode: 集号
  instructions: 附加指令正文；无时传 null
protected: false
---
# 角色与任务

{{ partial("drama_visual_role") }}
你的任务：基于下方已定稿的「分镜内容」，为每个 scene_id 逐条产出视觉层 JSON（image_prompt / video_prompt）。

**输出语言**：所有字符串值必须使用 {{ target_language }}；JSON 键名 / 枚举值保持英文。
**结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
**对齐约束**：每个分镜产出一条视觉层，`scene_id` 必须与下方内容逐字一致、不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。

{{ partial("pacing/drama") }}

# 上下文

<overview>
{{ project_overview.synopsis }}

题材：{{ project_overview.genre }}
主题：{{ project_overview.theme }}
世界观：{{ project_overview.world_setting }}
</overview>

<style>
风格：{{ style }}
描述：{{ style_description }}
画面比例：{{ aspect_ratio }}（{{ aspect_ratio_label }}）
</style>

{% if assets %}
<characters>
{{ partial("asset_appearance_bullets", entries=assets.characters) }}
</characters>

<scenes>
{{ partial("asset_appearance_bullets", entries=assets.scenes) }}
</scenes>

<props>
{{ partial("asset_appearance_bullets", entries=assets.props) }}
</props>

{{ partial("asset_appearance_note") }}

{% endif %}
分镜内容中的「口播」与「原文锚」仅供理解戏剧节奏与语境，不要复制进视觉字段。

<shots>
{{ scenes_content }}
</shots>

<episode_constraints>
当前正在生成第 {{ episode }} 集。每条视觉层的 scene_id 必须逐字等于上方分镜内容里的 scene_id；若该 ID 含拆分/编辑后缀（如 `_1`），也必须原样保留，不得改写、合并或新增。
</episode_constraints>

# 字段写作指引

对每个分镜，按下列章节填写视觉字段。

## 图片提示词（image_prompt）——切换到「摄影师」视角

- **image_prompt.scene**：{{ partial("scene_writing_guide") }}
- **image_prompt.composition.shot_type**：从枚举中按画面内容选择，不强加倾向。
- **image_prompt.composition.lighting**：{{ partial("lighting_writing_guide") }}
- **image_prompt.composition.ambiance**：{{ partial("ambiance_writing_guide") }}

## 视频提示词（video_prompt）——切换到「动作设计师」视角

- **video_prompt.action**：{{ partial("action_writing_guide") }}
- **video_prompt.camera_motion**：按画面内容自行选择。
- **video_prompt.ambiance_audio**：{{ partial("ambiance_audio_writing_guide") }}

# 创作目标

{{ partial("drama_visual_goal") }}
{% if instructions %}


# 附加指令
{{ instructions -}}
{% endif %}
