# 原型输出抓取（issue #2460）

由三个脚本生成，重新生成：

```bash
uv run python lib/prompt_templates_prototype/render_check.py
uv run python lib/prompt_templates_prototype/error_samples.py
uv run python lib/prompt_templates_prototype/settings_sketch.py
```

## 一、渲染逐字比对（render_check.py）

每个用例先用现有 builder 产出提示词，再用同一份入参经槽位值生产者投影后交给原型模版渲染；IDENTICAL 表示两者逐字节相同，DIFF 后附 unified diff。

```

### [IDENTICAL] script_plan/novel 全量：大纲含钩子与预告、下集大纲、目标时长、默认档、附加指令  （2494 字符）

### [IDENTICAL] script_plan/screenplay 全量：英文源、项目语速覆盖、无默认档  （2684 字符）

### [IDENTICAL] script_plan/novel 最小：无大纲、无目标、无默认档、空资产、无附加指令  （1937 字符）

### [IDENTICAL] script_plan/screenplay 半量：本集大纲只有预告语、无下集大纲、无附加指令  （2421 字符）

### [IDENTICAL] script_plan/novel 退化：本集大纲只有标题（无节点 / 钩子 / 预告）、下集大纲无标题  （2174 字符）

### [IDENTICAL] script_plan/未知 source_kind 回落 novel  （2004 字符）

### [IDENTICAL] prompt_authoring 全量：资产含衍生与多行描述与脏数据、9:16、附加指令  （3766 字符）

### [IDENTICAL] prompt_authoring 无资产块：三者皆 None、16:9、无附加指令  （3470 字符）

### [IDENTICAL] prompt_authoring 空资产块：三者皆空 dict（块仍渲染、显示暂无）、4:3  （3604 字符）

==============================================================================
0 个用例有差异 / 共 9 个
```

## 二、报错时机与信息（error_samples.py）

```
# 一、缺槽位

### 1a 调用方漏传 instructions 与 episode_target_duration（模块预检）
报错时机：渲染期，进入 Jinja 之前；一次列出全部缺失槽位
异常：lib.prompt_templates_prototype.engine.MissingSlot
信息：text/drama_script_plan: 缺少已声明的槽位 ['episode_target_duration', 'instructions']（可选槽位也须显式传 None）

### 1b 对照：绕过预检、只靠 StrictUndefined 拦 speech_unit（片段内引用）
报错时机：渲染期，执行到该表达式时才抛；一次只报一个，且信息不带模版 / 片段名
异常：jinja2.exceptions.UndefinedError
信息：'speech_unit' is undefined

### 1c 对照：绕过预检、漏传 instructions（只在真值条件里出现）
报错时机：渲染期，`{% if instructions %}` 对 Undefined 取布尔值时抛（StrictUndefined 连布尔测试都拦）
异常：jinja2.exceptions.UndefinedError
信息：'instructions' is undefined

### 1d 嵌套槽位缺键：episode_outline 只有 title，没有 story_beats / hook 键
报错时机：渲染期，片段里第一次取缺失键（story_beats）时抛；槽位值须是键齐全的投影（render_check 的 _full_shape 即为此而设）
异常：lib.prompt_templates_prototype.engine.RenderFailure
信息：text/drama_script_plan: StrictUndefined 拦截 —— 'dict object' has no attribute 'story_beats'

# 二、多余槽位

### 2a 调用方多传了 style_description（模块预检）
报错时机：渲染期，进入 Jinja 之前
异常：lib.prompt_templates_prototype.engine.ExtraSlot
信息：text/drama_script_plan: 传入了未声明的槽位 ['style_description']（已声明：['character_names', 'default_duration', 'durations', 'episode', 'episode_outline', 'episode_target_duration', 'instructions', 'max_duration', 'next_episode_outline', 'novel_text', 'project_overview', 'prop_names', 'scene_names', 'source_kind', 'speech_rate', 'speech_unit', 'style', 'target_language']）

### 2b 对照：绕过预检、只靠 Jinja
报错时机：不报错——Jinja 静默忽略上下文里多余的变量，多余槽位只能由模块拦
（未报错）返回：你的任务是将小说原文**改编**为结构化的分镜内容（含视觉改编描述、逐字口播 utterances 与原文锚 source_text），用于后续 AI 视频生成。⏎⏎**输出语言**：自然语言字符串值必须使用 中文；JSON 键名 / 枚举…

# 三、未知片段

### 3a 固定片段名不存在：partial("nope")
报错时机：加载期（构造注册表时静态扫描），整个目录拒绝加载
异常：lib.prompt_templates_prototype.engine.UnknownPartial
信息：text/bad: 引用了不存在的片段 'nope'（期望文件 lib/prompt_templates_prototype/fixtures_bad/unknown_partial/partials/nope.md）

### 3b 变体片段族拼错：variant("script_plan_tsak", …)
报错时机：加载期；族目录不存在或为空即报错
异常：lib.prompt_templates_prototype.engine.UnknownPartial
信息：text/bad: 引用了不存在的变体片段族 'script_plan_tsak'（期望目录 lib/prompt_templates_prototype/fixtures_bad/unknown_variant_family/partials/script_plan_tsak/ 下至少一个 <轴值>.md）

### 3c 对照：族存在但该轴值无文件——variant("script_plan_break_rule", "novel")
报错时机：不报错——按 Spec「不存在的变体即为空」渲染为空串（novel 的 segment_break 规则正是靠这一条消失）
（未报错）返回：（novel 渲染成功，见 render_check）…

### 3d 渲染期兜底：片段名由表达式动态拼出、静态扫描扫不到时
报错时机：渲染期；正则只扫字面量片段名，动态拼名只能靠渲染期兜底
异常：lib.prompt_templates_prototype.engine.UnknownPartial
信息：渲染期引用了不存在的片段 'nope'（期望文件 lib/prompt_templates_prototype/templates/partials/nope.md）

# 四、其他 fail-loud（加载期）

### 4a 正文引用未声明的槽位 target_language
报错时机：加载期（find_undeclared_variables 静态分析）
异常：lib.prompt_templates_prototype.engine.UndeclaredSlot
信息：text/bad: 正文（含片段）引用了未声明的槽位 ['target_language']

### 4b 片段引用未声明的槽位（正文本身干净）
报错时机：加载期；静态扫描沿 partial / variant 引用递归进片段
异常：lib.prompt_templates_prototype.engine.UndeclaredSlot
信息：text/bad: 正文（含片段）引用了未声明的槽位 ['target_language']

### 4c 使用白名单外的过滤器 upper
报错时机：加载期（编译）
异常：lib.prompt_templates_prototype.engine.TemplateError
信息：text/bad: 编译失败 —— No filter named 'upper'.

### 4d 重复模版 id
报错时机：加载期
异常：lib.prompt_templates_prototype.engine.DuplicateTemplateId
信息：模版 id 'text/bad' 重复：lib/prompt_templates_prototype/fixtures_bad/duplicate_id/text/a.md 与 lib/prompt_templates_prototype/fixtures_bad/duplicate_id/text/b.md

# 五、沙箱（渲染期）

### 5a 模版访问 style.__class__.__mro__
报错时机：渲染期；加载期静态分析看不出属性访问是否越权
异常：jinja2.exceptions.SecurityError
信息：access to attribute '__class__' of 'str' object is unsafe.

### 5b 沙箱默认全局（range / lipsum / cycler …）已清空
报错时机：渲染期；StrictUndefined 把 range 当未定义变量
异常：jinja2.exceptions.UndefinedError
信息：'range' is undefined
```

## 三、设置页草图（settings_sketch.py）

```
┌─ 系统设置 › 提示词模版 ──────────────────────────────────────────┐
│ PROMPT TEMPLATES                                    （只读 · 随版本内置）│
│                                                                      │
│ 文本生成
│   ▸ 剧情演绎 · 提示词编写           为 script_plan 已定稿的每个分镜补全视觉层（image_…
│   ▸ 剧情演绎 · 脚本规划            把小说或剧本源文拆为结构化分镜内容（视觉改编描述、逐字口播 utte…
└──────────────────────────────────────────────────────────────────────┘

┌─ 模版详情 ───────────────────────────────────────────────────────────┐
│ 剧情演绎 · 脚本规划
│ id: text/drama_script_plan    类别: 文本生成    protected: False
│ 把小说或剧本源文拆为结构化分镜内容（视觉改编描述、逐字口播 utterances、原文锚 source_text），供 generate_script_plan 的剧情变体调用。
│
│ 适用范围
│   content_modes      drama
│   generation_modes   storyboard
│   source_kinds       novel, screenplay
│
│ 槽位（18）
│   {{ source_kind }}             源文类型轴值（novel / screenplay），用于解析命名变体片段与源文标签
│   {{ target_language }}         输出语言（自然语言字符串值所用语言）
│   {{ project_overview }}        项目概述，键齐全的对象 {synopsis, genre, theme, world_setting}
│   {{ style }}                   项目风格值
│   {{ character_names }}         可写进引用字段的角色名列表（本体在前、衍生紧随，形如 本体/衍生）
│   {{ scene_names }}             可写进引用字段的场景名列表
│   {{ prop_names }}              可写进引用字段的道具名列表
│   {{ novel_text }}              本集源文正文
│   {{ episode }}                 集号
│   {{ durations }}               模型支持的秒数档位，逗号分隔文本（如 "4, 6, 8"）
│   {{ max_duration }}            最长档位（秒）
│   {{ default_duration }}        单场默认秒数；无默认时传 null
│   {{ speech_rate }}             口播语速（阅读单位 / 秒），已格式化为文本
│   {{ speech_unit }}             阅读单位量词（字 / 词）
│   {{ episode_target_duration }} 单集目标时长（秒）；未设置时传 null
│   {{ episode_outline }}         本集大纲，键齐全的对象 {title, story_beats, hook, next_episode_teaser}；无规划时传 null
│   {{ next_episode_outline }}    下集大纲，形状同上；无规划时传 null
│   {{ instructions }}            附加指令正文；无时传 null
│
│ 引用的片段（20，按首次引用顺序；变体族展开为全部轴值）
│   script_plan_task/novel                       你的任务是将小说原文**改编**为结构化的分镜内容（含视…
│   script_plan_task/screenplay                  你的任务是从作者已写好的剧本中**提取**结构化的分镜内…
│   script_plan_language_rule/novel              自然语言字符串值必须使用 {{ target_langu…
│   script_plan_language_rule/screenplay         自然语言字符串值必须使用 {{ target_langu…
│   pacing/drama                                 分集节奏（短剧体裁建议）：…
│   asset_name_bullets                           {% for name in names %}…
│   script_plan_source_heading/novel             小说原文…
│   script_plan_source_heading/screenplay        剧本原文…
│   episode_outline_lines                        {% if outline.story_beats %}…
│   hook_landing_guide                           末场（最后一个或几个分镜）的画面与对白须实际呈现集尾钩子…
│   script_plan_duration_tiers                   {% if default_duration %}…
│   script_plan_speech_lower_bound               再按台词口播长度设下界：先估算该场 utterances…
│   episode_target_duration_rule                 本集成片目标时长约 {{ episode_target_…
│   script_plan_break_rule/screenplay            - **segment_break**：沿用剧本自带的场…
│   asset_name_candidates                        {% if names %}{{ names | joi…
│   script_plan_scene_rule/novel                 改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合…
│   script_plan_scene_rule/screenplay            把作者写下的运镜、景别、舞台提示、视觉场面转写为画面视觉…
│   script_plan_source_text_guide                逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（…
│   script_plan_utterances_rule/novel            按口播出现顺序产出发声序列，台词（dialogue）的 …
│   script_plan_utterances_rule/screenplay       把作者写下的台词与画外音**逐字照搬**为有序发声序列，…
│
│ 源文（槽位与片段引用以标记呈现，页面上可展开片段正文）
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
│ {{ variant("script_plan_task", source_kind) }}
│ 
│ **输出语言**：{{ variant("script_plan_language_rule", source_kind) }}
│ **结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
│ 
│ {{ partial("pacing/drama") }}
│ 
│ ## 项目信息
│ 
│ <overview>
│ {{ project_overview.synopsis }}
│ 
│ ……
└──────────────────────────────────────────────────────────────────────┘
```
