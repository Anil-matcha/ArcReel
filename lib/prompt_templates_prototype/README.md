# 提示词模版原型（issue #2460，HITL 门禁）

**这是一次性原型，不进产品代码。** 只存在于分支 `prototype/2460-prompt-templates`，验证完成后 main 只保留被裁定的决策（进 Spec #2459 / ADR），本目录不合并。

## 回答的问题

Spec #2459 决定：一个生成入口一个整段模版文件，共享措辞抽成片段，轴上的口径差异用**命名变体片段**（`variant("族名", 轴值)`）而非条件分支表达，条件只允许对槽位做**真值判断**。本原型用两个最难的入口验证这套约束能否**逐字无损**承载现有措辞，以及 Jinja2 沙箱 + StrictUndefined + 白名单过滤器在坏输入下**何时、以什么信息报错**。

- 入口一：drama 脚本规划（`lib.prompt_builders_script.build_normalize_prompt`）——含 novel / screenplay 口径差异、集尾钩子落地、单集目标时长、下集大纲、附加指令四个可选块。
- 入口二：drama 提示词编写（`build_drama_prompt`）——含可选资产外观块与附加指令。

## 怎么跑

```bash
uv run python lib/prompt_templates_prototype/render_check.py    # 9 个用例：builder 输出 vs 模版渲染，逐字 diff
uv run python lib/prompt_templates_prototype/error_samples.py   # 缺槽位 / 多余槽位 / 未知片段 … 的报错时机与信息
uv run python lib/prompt_templates_prototype/settings_sketch.py # 用真实元数据画出设置页列表与详情的文本草图
```

三个脚本的输出已抓到 [REPORT.md](REPORT.md)，不跑也能读。

## 目录

```
engine.py                       引擎（三个动作：render / list_templates / read_source；加载期校验；片段解析）
templates/
  text/drama_script_plan.md     入口一模版（frontmatter + 完整提示词正文）        ← 请重点阅读
  text/drama_prompt_authoring.md 入口二模版                                     ← 请重点阅读
  partials/*.md                 固定片段：写作指导、注记、角色定位、带槽位的规则句、列表渲染
  partials/<族>/<轴值>.md        命名变体片段：script_plan_task / _language_rule / _scene_rule /
                                _utterances_rule / _break_rule / _source_heading，轴 = source_kind
  partials/pacing/drama.md      节奏规则（正文逐字取自 agent_runtime_profile 的 episode-pacing-drama.md）
render_check.py                 用例 + 槽位值生产者（slots_for_*，即未来留在代码里的投影层）
error_samples.py                报错样例；fixtures_bad/ 是各种坏模版的最小夹具目录
settings_sketch.py              设置页草图
REPORT.md                       三个脚本的抓取输出
```

片段文件的措辞由脚本从现有 builder 常量逐字导出（一次性），不是手抄。

## 结论摘要

- **逐字等价：9 / 9 用例 IDENTICAL**（novel 全量 / screenplay 全量 / 最小 / 半量 / 退化大纲 / 未知 source_kind 回落，以及 prompt_authoring 的有资产 / 无资产块 / 空资产块），diff 见 REPORT.md。
- **轴差异全部落在 6 个变体族**，模版正文没有任何 `source_kind == …` 比较；novel 没有 segment_break 规则这件事，靠「族目录里没有 novel.md ⇒ 渲染为空」表达。
- **可选块全部是真值判断**：`episode_outline`、`episode_outline.hook or …next_episode_teaser`、`next_episode_outline`、`episode_target_duration`、`instructions`、`assets`、`default_duration`。
- **引擎行为**：多余槽位 Jinja 静默忽略、必须由模块预检拦；缺槽位模块预检一次列全，StrictUndefined 只是兜底且信息不带模版名；未知片段加载期拦住（整个目录拒绝加载）；未声明槽位沿片段递归静态扫描；白名单外过滤器编译期拦；沙箱越权渲染期拦。

## 需要维护者裁定的点

按「回到 Spec 的可能性」从高到低排列。

1. **列表槽位允许 `{% for %}` 吗？** 候选名清单、大纲故事节点、资产外观三处用了循环（`asset_name_bullets` / `asset_name_candidates` / `episode_outline_lines` / `asset_appearance_bullets` 四个片段）。Spec 只规定「条件仅真值判断」，没提循环。替代方案是代码把列表预渲染成字符串槽位，但那会把「故事节点：」「（暂无）」「当前形态：」这类措辞藏回代码。原型选了循环进模版；若裁定「列表一律代码预渲染」，四个片段并回 `slots_for_*` 即可，模版正文不变。
2. **嵌套槽位必须键齐全。** StrictUndefined 对 `project_overview.synopsis`、`episode_outline.hook` 的缺键同样 fail loud（样例 1d），而现有 builder 用 `.get()` 容忍缺键。原型让槽位值生产者补齐形状（`render_check._full_shape`）。另一条路是模版里写 `{{ outline.get("hook") }}`，可读性差。建议前者，并把「槽位值是键齐全的投影」写进 ADR。
3. **躲不掉的轴值比较落在代码。** `aspect_ratio_label`（9:16 → 竖屏构图 / 16:9 → 横屏构图 / 其余 → `<比例> 构图`）是三分支比较，按 Spec 不能进模版，故作为槽位由代码产出。这与「口径差异用变体片段」并不冲突（它不是轴，是安全处理函数），但要在 ADR 里点明边界：**变体片段承载措辞差异，代码承载取值差异**。
4. **资产块条件从三个槽位合成一个。** 现状 `characters / scenes / props` 任一非 None 就渲染块（三个空 dict 也渲染）。真值判断区分不了「非 None 但为空」，故合成单一槽位 `assets`（null = 不渲染块）。真实调用方 `script_generator` 总是传 dict，行为不变。
5. **两处现状空白瑕疵为逐字等价被原样复现，迁移时建议顺手规范化（措辞不变、只动空白）**：
   - `segment_break` 规则粘在 `duration_seconds` 行末尾，变体文件因此带一个前导空行（`partials/script_plan_break_rule/screenplay.md` 第一行为空）。建议让它独立成一行，变体文件就不再需要前导空行。
   - 附加指令前是**两个**空行（prompt 尾换行 + `append_user_instructions` 的 `\n\n`），且有指令时末尾无换行、无指令时有。模版为复现用了 `{{ instructions -}}` 与两行空行。建议统一为单空行 + 恒定尾换行。
6. **片段以表达式引用（`{{ partial(...) }}` / `{{ variant(...) }}`），不用 `{% include %}`。** 原因：开了 `trim_blocks` 后 include 标签后面的换行会被吃掉，行级拼接不可控；表达式形式加上一条规则「片段渲染结果去尾换行，由引用处决定换行」就同时覆盖行内（`- **source_text**：{{ partial(...) }}`）与整行（`{{ partial("pacing/drama") }}`）两种用法。代价是模版里多一个函数调用的样子。
7. **长句片段一行到底。** 如 `script_plan_speech_lower_bound.md` 是 200+ 字符的单行——现状措辞里没有换行符，硬换行就是改措辞。靠编辑器软换行阅读。
8. **静态扫描只认字面量片段名。** `partial("no" ~ "pe")` 这种动态拼名加载期扫不到，只能渲染期兜底（样例 3d）。可以在 ADR 里直接禁止动态拼名，或加一条内置目录测试。

## frontmatter 示例

取自 `templates/text/drama_script_plan.md` 头部（字段即 Spec 列出的七个：id / category / title / description / applies_to / slots / protected）：

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
slots:
  source_kind: 源文类型轴值（novel / screenplay），用于解析命名变体片段与源文标签
  target_language: 输出语言（自然语言字符串值所用语言）
  project_overview: 项目概述，键齐全的对象 {synopsis, genre, theme, world_setting}
  …
  instructions: 附加指令正文；无时传 null
protected: false
---
```

`slots` 是「名字 → 说明」的映射：名字集合是加载期校验（正文 + 片段引用 ⊆ 声明）与渲染期校验（传入 = 声明）的依据，说明文字直接进设置页详情。`protected` 原型未赋语义，只占位（Spec 留给后期编辑与替换）。

## 设置页详情草图

由 `settings_sketch.py` 从真实元数据画出，完整输出见 REPORT.md 第三节。要点：

- 列表按 `category` 分组（文本生成 / 资产图 / 分镜图 / 视频），每项显示 `title` 与 `description`。
- 详情页四段：元数据（id / 类别 / 用途 / 适用范围）、槽位表（名字 + 说明）、引用片段清单（按首次引用顺序，变体族展开为全部轴值、可展开正文）、源文（槽位与片段引用以标记呈现）。
- 数据全部来自 `list_templates` 与 `read_source` 两个动作，不需要额外接口。

## 渲染样张

`samples/` 下是三份完整渲染结果（novel 全量、screenplay 全量、prompt_authoring 全量），与 builder 输出逐字相同，供不跑脚本时直接阅读最终提示词长什么样。
