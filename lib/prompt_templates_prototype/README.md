# 提示词模版原型（issue #2460，HITL 门禁）

**这是一次性原型，不进产品代码。** 只存在于分支 `prototype/2460-prompt-templates`，验证完成后 main 只保留被裁定的决策（进 Spec #2459 / ADR），本目录不合并。

## 回答的问题

Spec #2459 决定：一个生成入口一个整段模版文件，共享措辞抽成片段，轴上的口径差异用**命名变体片段**（`variant("族名", 轴值)`）而非条件分支表达，条件只允许对槽位做**真值判断**。本原型用两个最难的入口验证这套约束能否承载现有措辞、模版是否可读，以及 Jinja2 沙箱 + StrictUndefined + 白名单过滤器在坏输入下**何时、以什么信息报错**。

- 入口一：drama 脚本规划（`lib.prompt_builders_script.build_normalize_prompt`）——含 novel / screenplay 口径差异、集尾钩子落地、单集目标时长、下集大纲、附加指令四个可选块。
- 入口二：drama 提示词编写（`build_drama_prompt`）——含可选资产外观块与附加指令。

**第二轮起原型不再要求逐字一致。** 维护者评审后裁定：措辞收敛与结构整理在原型里直接做，渲染结果与现有 builder 的差异以 diff 呈现，每个 hunk 都应能对到下面「措辞变更」清单里的一条；对不上的就是回归。第一轮（逐字一致，9 / 9 IDENTICAL）的状态在提交 `4f130904`。

## 怎么跑

```bash
uv run python lib/prompt_templates_prototype/render_check.py    # 9 个用例：builder 输出 vs 模版渲染的 unified diff，并写出 samples/
uv run python lib/prompt_templates_prototype/error_samples.py   # 缺槽位 / 多余槽位 / 未知片段 … 的报错时机与信息
uv run python lib/prompt_templates_prototype/settings_sketch.py # 用真实元数据画出设置页列表与详情（含输出结构块）的文本草图
```

三个脚本的输出已抓到 [REPORT.md](REPORT.md)，不跑也能读。

## 目录

```
engine.py                       引擎（三个动作：render / list_templates / read_source；加载期校验；片段解析）
templates/
  text/drama_script_plan.md     入口一模版（frontmatter + 完整提示词正文）        ← 请重点阅读
  text/drama_prompt_authoring.md 入口二模版                                     ← 请重点阅读
  partials/shared/*.md          跨模版共享的固定片段：五个写作指导、资产外观注记、目标时长句、四个列表渲染
  partials/shared/pacing/drama.md 节奏规则（正文逐字取自 agent_runtime_profile 的 episode-pacing-drama.md）
  partials/text/drama_script_plan/<族>/<轴值>.md
                                入口一私有的命名变体片段：task / language_rule / scene_rule /
                                utterances_rule / break_rule，轴 = source_kind
render_check.py                 用例 + 槽位值生产者（slots_for_*，即未来留在代码里的投影层）+ collect()
error_samples.py                报错样例；fixtures_bad/ 是各种坏模版的最小夹具目录
settings_sketch.py              设置页草图（列表、详情、输出结构）
samples/*.rendered.md           三份全量渲染结果；samples/diffs/NN.diff 是九个用例的 diff
REPORT.md                       三个脚本的抓取输出
```

### 片段目录约定（第二轮定下）

- 片段名就是相对 `partials/` 的路径，引擎不做隐式查找。
- `shared/` 放跨模版共享的片段。**改它会牵连别的入口**：五个写作指导同时被 narration 提示词编写与广告片两条路线使用，`episode_target_duration_rule` 被 narration 切分使用，`asset_appearance_note` 被 narration 提示词编写使用。
- `<模版 id>/` 放只属于这个模版的命名变体片段，目录名镜像模版 id。它们进片段库的理由不是复用，而是「模版内不能按轴值写条件分支」——这与 `CONTEXT.md` 现行「模版片段 = 被多个模版引用的共享措辞」的定义有张力，需要 Spec 把定义放宽到「跨模版共享的措辞，或单个模版按轴拆出的命名变体」。
- 只被一个模版引用的固定措辞不做片段，直接写在正文里。第一轮的 `script_plan_duration_tiers` / `script_plan_speech_lower_bound` / `script_plan_source_text_guide` / `hook_landing_guide` / `drama_visual_role` / `drama_visual_goal` 六个片段据此内联。
- 片段数：第一轮 28 个文件 → 第二轮 22 个（共享 12、入口一私有 10）。

## 措辞变更（第二轮，diff 的对号表）

编号在审阅页与 diff 注记里通用。「来源」指第一轮措辞评估的出处：both = 本会话与盲评一致，blind = 盲评提出，mine = 本会话提出，Q = 维护者第二轮六问。

| 编号 | 位置 | 动作 | 来源 | 影响面 |
|---|---|---|---|---|
| C1 | 提示词编写 | scene_id 约束三处合并为 `<episode_constraints>` 一处：删「对齐约束」行、角色定位句删「只按 scene_id 逐条产出」 | both（W1） | 本入口 |
| C2 | 脚本规划 · 口播下界 | 删「保存时会另有提示」 | both（W2） | 本入口 |
| C3 | `shared/action_writing_guide` | 只删「而误判在异步生成阶段才报错——任务已排队、已计费」半句；禁词清单、原则句、正向示范保留 | both（W3） | **narration 提示词编写、广告两路线** |
| C4 | 脚本规划 · duration_seconds | 拆为「档位 / 口播下界 / 单集目标」三个子条目；`segment_break` 独立成行，变体文件不再带前导空行 | both（W4）+ 裁定点 5 | 本入口 |
| C5 | 提示词编写 | 删正文任务句「你的任务：基于下方…」，角色定位句已含 | blind（W5） | 本入口 |
| C6 | 脚本规划 · novel utterances | 删破折号后的同义复述「是否产出由你依语境创作判断，自然需要则产出」 | blind（W6） | 本入口 |
| C7 | `shared/episode_target_duration_rule` | 「软目标」后的对称展开合并为「不要靠注水 / 切碎凑满，也不要为压进目标删减必要情节」 | blind（W7） | **narration 切分** |
| C8 | 脚本规划 · 口播下界 | 「单向下界」后半段缩短，保留 utterances 为空例外与超最长档取最长档 | blind（W8） | 本入口 |
| C9 | 提示词编写 · 角色定位句 | 删「不要改写或重述口播」，保留正文「口播与原文锚仅供理解…不要复制进视觉字段」 | blind（W9） | 本入口 |
| C10 | 提示词编写 | 删 `video_prompt.camera_motion`「按画面内容自行选择」空指令行；枚举由 schema 承载 | blind（W11） | 本入口 |
| C11 | 脚本规划 · 群演 | 候选清单处删「不登记为角色资产」；screenplay utterances 删重复的「老人甲 / 村民若干」举例 | mine（W12） | 本入口 |
| C12 | 脚本规划 · 输出语言 | 主句提回正文，变体只留例外从句（**渲染无差异**，只动结构） | 分歧 D2 | 本入口 |
| C13 | 脚本规划 · 源文标题 | 「小说原文 / 剧本原文」统一为「源文」，`source_heading` 族删除 | Q3 | 本入口 |
| C14 | 脚本规划 · novel segment_break | **新增**规则：「改编时自行判断：地点 / 时间跳转或场景切换后的第一个分镜标「是」，同一时空内的后续分镜标「否」」。此前 novel 模式对该字段没有任何指引 | Q2 | 本入口 |
| C15 | 两入口 · 附加指令 | 附加指令前单空行、尾换行恒定（原为两空行、有指令时无尾换行） | 裁定点 5 | 两入口 |

**未采纳**（保留现状）：

- W10 `scene_writing_guide` 第四例「反例（过短）」——示例对长度的锚定强于规则句，把握低，保留。
- 分歧 D1 提示词编写里的节奏规则中段一条——节奏正文逐字取自 Agent profile 的同一文件，不为一个入口分叉一份副本；若要裁，应在 Agent profile 侧一起裁。
- Q1 schema 与提示词的三处重复（`source_text`、静态 / 动态分工句、utterances 时序）——提示词侧保留可操作的那句，schema 描述属代码、不在原型范围。

## 结论摘要

- **模版可读性**：两份模版正文各一屏半，轴差异全部落在 5 个私有变体族，正文没有任何 `source_kind == …` 比较；novel / screenplay 的 `segment_break` 规则各有一个文件（C14 之前 novel 靠「族目录里没有 novel.md ⇒ 渲染为空」表达）。
- **可选块全部是真值判断**：`episode_outline`、`episode_outline.hook or …next_episode_teaser`、`next_episode_outline`、`episode_target_duration`、`instructions`、`assets`、`default_duration`。
- **9 / 9 用例有差异，全部可对号**：见 REPORT.md 第一节与 `samples/diffs/`。
- **引擎行为**：多余槽位 Jinja 静默忽略、必须由模块预检拦；缺槽位模块预检一次列全，StrictUndefined 只是兜底且信息不带模版名；未知片段加载期拦住（整个目录拒绝加载）；未声明槽位沿片段递归静态扫描；白名单外过滤器编译期拦；沙箱越权渲染期拦。
- **输出结构进设置页**：frontmatter 新增可选 `output_schema: module:Class`，详情页多一块折叠的「输出结构」。`shot_type` / `camera_motion` 的枚举值只存在于 schema，没有这一块设置页读者看不到它们。

## 需要维护者裁定的点

按「回到 Spec 的可能性」从高到低排列。

1. **列表槽位允许 `{% for %}` 吗？** 候选名清单、大纲故事节点、资产外观三处用了循环（`shared/asset_name_bullets` / `asset_name_candidates` / `episode_outline_lines` / `asset_appearance_bullets` 四个片段）。Spec 只规定「条件仅真值判断」，没提循环。替代方案是代码把列表预渲染成字符串槽位，但那会把「故事节点：」「（暂无）」「当前形态：」这类措辞藏回代码。原型选了循环进模版；若裁定「列表一律代码预渲染」，四个片段并回 `slots_for_*` 即可，模版正文不变。
2. **嵌套槽位必须键齐全。** StrictUndefined 对 `project_overview.synopsis`、`episode_outline.hook` 的缺键同样 fail loud（样例 1d），而现有 builder 用 `.get()` 容忍缺键。原型让槽位值生产者补齐形状（`render_check._full_shape`）。另一条路是模版里写 `{{ outline.get("hook") }}`，可读性差。建议前者，并把「槽位值是键齐全的投影」写进 ADR。
3. **躲不掉的轴值比较落在代码。** `aspect_ratio_label`（9:16 → 竖屏构图 / 16:9 → 横屏构图 / 其余 → `<比例> 构图`）是三分支比较，按 Spec 不能进模版，故作为槽位由代码产出。这与「口径差异用变体片段」并不冲突（它不是轴，是安全处理函数），但要在 ADR 里点明边界：**变体片段承载措辞差异，代码承载取值差异**。
4. **资产块条件从三个槽位合成一个。** 现状 `characters / scenes / props` 任一非 None 就渲染块（三个空 dict 也渲染）。真值判断区分不了「非 None 但为空」，故合成单一槽位 `assets`（null = 不渲染块）。真实调用方 `script_generator` 总是传 dict，行为不变。
5. **共享片段的改动跨入口生效。** C3 与 C7 动的是 `shared/` 片段，narration 提示词编写、narration 切分与广告两路线迁移时会一并收到新措辞。这正是片段库的用途，但下游票（#2467 / #2469）的验收「口径与迁移前一致」要改为「与 Spec 措辞收敛后的口径一致」。
6. **单模版私有变体族与 `CONTEXT.md` 定义的张力。** 见上文「片段目录约定」。
7. **片段以表达式引用（`{{ partial(...) }}` / `{{ variant(...) }}`），不用 `{% include %}`。** 原因：开了 `trim_blocks` 后 include 标签后面的换行会被吃掉，行级拼接不可控；表达式形式加上一条规则「片段渲染结果去尾换行，由引用处决定换行」就同时覆盖行内与整行两种用法。代价是模版里多一个函数调用的样子。
8. **静态扫描只认字面量片段名。** `partial("no" ~ "pe")` 这种动态拼名加载期扫不到，只能渲染期兜底（样例 3d）。可以在 ADR 里直接禁止动态拼名，或加一条内置目录测试。

## frontmatter 示例

取自 `templates/text/drama_script_plan.md` 头部（Spec 列出的七个字段 id / category / title / description / applies_to / slots / protected，加第二轮新增的可选 `output_schema`）：

```yaml
---
id: text/drama_script_plan
category: text
title: 剧情演绎 · 脚本规划
description: 把小说或剧本源文拆为结构化分镜内容（视觉改编描述、逐字口播 utterances、原文锚 source_text），供 generate_script_plan 的剧情变体调用。
applies_to:
  content_modes: [drama]
  generation_modes: [storyboard]
  source_kinds: [novel, screenplay]
output_schema: lib.script_models:DramaNormalizedScript
slots:
  source_kind: 源文类型轴值（novel / screenplay），用于解析命名变体片段与源文标签
  target_language: 输出语言（自然语言字符串值所用语言）
  project_overview: 项目概述，键齐全的对象 {synopsis, genre, theme, world_setting}
  …
  instructions: 附加指令正文；无时传 null
protected: false
---
```

`slots` 是「名字 → 说明」的映射：名字集合是加载期校验（正文 + 片段引用 ⊆ 声明）与渲染期校验（传入 = 声明）的依据，说明文字直接进设置页详情。`output_schema` 指向 response_schema 的 pydantic 模型，schema 本身留在代码里（它同时是校验与落盘契约），模版只引用。`protected` 原型未赋语义，只占位（Spec 留给后期编辑与替换）。

## 设置页详情草图

由 `settings_sketch.py` 从真实元数据画出，完整输出见 REPORT.md 第三节。要点：

- 列表按 `category` 分组（文本生成 / 资产图 / 分镜图 / 视频），每项显示 `title` 与 `description`。
- 详情页五段：元数据（id / 类别 / 用途 / 适用范围）、槽位表（名字 + 说明）、引用片段清单（按首次引用顺序，变体族展开为全部轴值、可展开正文）、**输出结构**（折叠；字段路径 / 类型或枚举 / 说明）、源文（槽位与片段引用以标记呈现）。
- 数据全部来自 `list_templates` 与 `read_source` 两个动作，加一次按 `output_schema` 取 JSON schema；不需要额外接口。

## 渲染样张

`samples/` 下是三份完整渲染结果（novel 全量、screenplay 全量、prompt_authoring 全量）与九个用例的 diff，供不跑脚本时直接阅读最终提示词长什么样、改了什么。
