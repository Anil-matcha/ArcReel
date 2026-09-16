# 原型输出抓取（issue #2460）

由三个脚本生成，重新生成：

```bash
uv run python lib/prompt_templates_prototype/render_check.py
uv run python lib/prompt_templates_prototype/error_samples.py
uv run python lib/prompt_templates_prototype/settings_sketch.py
```

## 一、渲染 diff（render_check.py）

每个用例先用现有 builder 产出提示词，再用同一份入参经槽位值生产者投影后交给原型模版渲染，附 unified diff。原型不再要求逐字一致：每个 hunk 都应能对到 README「措辞变更」清单里的一条，对不上的就是回归。

```
### [DIFF] script_plan/novel 全量：大纲含钩子与预告、下集大纲、目标时长、默认档、附加指令  （builder 2494 字符 → 模版 2458 字符）
--- builder（现状）
+++ template（原型）
@@ -40,7 +40,7 @@
 - 怀表
 </props>
 
-## 小说原文
+## 源文
 
 <novel>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -76,22 +76,25 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。本集成片目标时长约 90 秒：据此决定本集的单元数与拆分粒度，让各单元时长合计向该目标靠拢。这是软目标、不是硬上限——内容不足以支撑目标时宁可少拆几个，不要靠注水 / 切碎凑满；内容确实需要更多篇幅时可以超出目标，不要为压进目标删减必要情节。
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+  - 单集目标：本集成片目标时长约 90 秒：据此决定本集的单元数与拆分粒度，让各单元时长合计向该目标靠拢。这是软目标、不是硬上限：不要靠注水 / 切碎凑满，也不要为压进目标删减必要情节。
+- **segment_break**：改编时自行判断：地点 / 时间跳转或场景切换后的第一个分镜标「是」，同一时空内的后续分镜标「否」。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[姜月茴, 姜月茴/病中, 沈管家, 老人甲]
   - 候选 scenes：[祠堂]
   - 候选 props：[玉佩, 怀表]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合画面呈现。以本分镜当下的单一时空落笔——原文的回忆、闪回、心理活动，改编为此刻可见的载体（人物神态、手中物件、环境痕迹）；这段描述是后续单帧分镜画面的内容来源。**台词 / 画外音不要写进这里**——口播统一落在 utterances。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）——是否产出由你依语境创作判断，自然需要则产出。分镜无口播则留空。
+- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。
 
-
 # 附加指令
 多用近景。
-少用旁白。+少用旁白。

### [DIFF] script_plan/screenplay 全量：英文源、项目语速覆盖、无默认档  （builder 2684 字符 → 模版 2562 字符）
--- builder（现状）
+++ template（原型）
@@ -40,7 +40,7 @@
 - 怀表
 </props>
 
-## 剧本原文
+## 源文
 
 <screenplay>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -76,22 +76,24 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容复杂度匹配合适时长（最长 10 秒），不强制默认值。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 2.5 词/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。本集成片目标时长约 120 秒：据此决定本集的单元数与拆分粒度，让各单元时长合计向该目标靠拢。这是软目标、不是硬上限——内容不足以支撑目标时宁可少拆几个，不要靠注水 / 切碎凑满；内容确实需要更多篇幅时可以超出目标，不要为压进目标删减必要情节。
-- **segment_break**：沿用剧本自带的场次/场景切换——场次变更（地点 / 时间 / 场景切换）标「是」，同一场次内标「否」；不要重新切碎作者的场次
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容复杂度匹配合适时长（最长 10 秒），不强制默认值。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 2.5 词/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+  - 单集目标：本集成片目标时长约 120 秒：据此决定本集的单元数与拆分粒度，让各单元时长合计向该目标靠拢。这是软目标、不是硬上限：不要靠注水 / 切碎凑满，也不要为压进目标删减必要情节。
+- **segment_break**：沿用剧本自带的场次 / 场景切换：场次变更（地点 / 时间 / 场景切换）标「是」，同一场次内标「否」；不要重新切碎作者的场次。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[姜月茴, 姜月茴/病中, 沈管家, 老人甲]
   - 候选 scenes：[祠堂]
   - 候选 props：[玉佩, 怀表]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：把作者写下的运镜、景别、舞台提示、视觉场面转写为画面视觉描述。**台词 / 画外音不要写进这里**——逐字落在 utterances；排版符号（markdown、△、各类标签、表格、emoji）一律剥离，只留干净文本。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：把作者写下的台词与画外音**逐字照搬**为有序发声序列，按它们在分镜中的先后排列：台词（dialogue）的 speaker 填原文说话人——命名角色应来自 characters_in_scene，路人群演如「老人甲」「村民若干」照填原文称呼即可、可不在 characters_in_scene；画外音 / 旁白写为 voiceover。不改写、不润色、不删减、不补写。分镜无口播则留空。
+- **utterances**：把作者写下的台词与画外音**逐字照搬**为有序发声序列，按它们在分镜中的先后排列：台词（dialogue）的 speaker 填原文说话人（命名角色来自 characters_in_scene，群演照填原文称呼）；画外音 / 旁白写为 voiceover。不改写、不润色、不删减、不补写。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。
 
-
 # 附加指令
-Keep it moody.+Keep it moody.

### [DIFF] script_plan/novel 最小：无大纲、无目标、无默认档、空资产、无附加指令  （builder 1937 字符 → 模版 1926 字符）
--- builder（现状）
+++ template（原型）
@@ -36,7 +36,7 @@
 （暂无）
 </props>
 
-## 小说原文
+## 源文
 
 <novel>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -51,17 +51,20 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容复杂度匹配合适时长（最长 10 秒），不强制默认值。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容复杂度匹配合适时长（最长 10 秒），不强制默认值。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+- **segment_break**：改编时自行判断：地点 / 时间跳转或场景切换后的第一个分镜标「是」，同一时空内的后续分镜标「否」。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[（暂无）]
   - 候选 scenes：[（暂无）]
   - 候选 props：[（暂无）]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合画面呈现。以本分镜当下的单一时空落笔——原文的回忆、闪回、心理活动，改编为此刻可见的载体（人物神态、手中物件、环境痕迹）；这段描述是后续单帧分镜画面的内容来源。**台词 / 画外音不要写进这里**——口播统一落在 utterances。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）——是否产出由你依语境创作判断，自然需要则产出。分镜无口播则留空。
+- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。

### [DIFF] script_plan/screenplay 半量：本集大纲只有预告语、无下集大纲、无附加指令  （builder 2421 字符 → 模版 2324 字符）
--- builder（现状）
+++ template（原型）
@@ -40,7 +40,7 @@
 - 怀表
 </props>
 
-## 剧本原文
+## 源文
 
 <screenplay>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -67,18 +67,20 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。
-- **segment_break**：沿用剧本自带的场次/场景切换——场次变更（地点 / 时间 / 场景切换）标「是」，同一场次内标「否」；不要重新切碎作者的场次
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+- **segment_break**：沿用剧本自带的场次 / 场景切换：场次变更（地点 / 时间 / 场景切换）标「是」，同一场次内标「否」；不要重新切碎作者的场次。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[姜月茴, 姜月茴/病中, 沈管家, 老人甲]
   - 候选 scenes：[祠堂]
   - 候选 props：[玉佩, 怀表]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：把作者写下的运镜、景别、舞台提示、视觉场面转写为画面视觉描述。**台词 / 画外音不要写进这里**——逐字落在 utterances；排版符号（markdown、△、各类标签、表格、emoji）一律剥离，只留干净文本。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：把作者写下的台词与画外音**逐字照搬**为有序发声序列，按它们在分镜中的先后排列：台词（dialogue）的 speaker 填原文说话人——命名角色应来自 characters_in_scene，路人群演如「老人甲」「村民若干」照填原文称呼即可、可不在 characters_in_scene；画外音 / 旁白写为 voiceover。不改写、不润色、不删减、不补写。分镜无口播则留空。
+- **utterances**：把作者写下的台词与画外音**逐字照搬**为有序发声序列，按它们在分镜中的先后排列：台词（dialogue）的 speaker 填原文说话人（命名角色来自 characters_in_scene，群演照填原文称呼）；画外音 / 旁白写为 voiceover。不改写、不润色、不删减、不补写。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。

### [DIFF] script_plan/novel 退化：本集大纲只有标题（无节点 / 钩子 / 预告）、下集大纲无标题  （builder 2174 字符 → 模版 2163 字符）
--- builder（现状）
+++ template（原型）
@@ -40,7 +40,7 @@
 - 怀表
 </props>
 
-## 小说原文
+## 源文
 
 <novel>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -67,17 +67,20 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+- **segment_break**：改编时自行判断：地点 / 时间跳转或场景切换后的第一个分镜标「是」，同一时空内的后续分镜标「否」。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[姜月茴, 姜月茴/病中, 沈管家, 老人甲]
   - 候选 scenes：[祠堂]
   - 候选 props：[玉佩, 怀表]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合画面呈现。以本分镜当下的单一时空落笔——原文的回忆、闪回、心理活动，改编为此刻可见的载体（人物神态、手中物件、环境痕迹）；这段描述是后续单帧分镜画面的内容来源。**台词 / 画外音不要写进这里**——口播统一落在 utterances。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）——是否产出由你依语境创作判断，自然需要则产出。分镜无口播则留空。
+- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。

### [DIFF] script_plan/未知 source_kind 回落 novel  （builder 2004 字符 → 模版 1993 字符）
--- builder（现状）
+++ template（原型）
@@ -40,7 +40,7 @@
 - 怀表
 </props>
 
-## 小说原文
+## 源文
 
 <novel>
 姜月茴推开祠堂的门，灰尘簌簌落下。
@@ -55,17 +55,20 @@
 ## 基础字段
 
 - **scene_id**：`E1S{两位序号}` 格式（如 E1S01），按分镜顺序递增，不得用其他集号前缀。
-- **duration_seconds**：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。再按台词口播长度设下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位；这是单向下界——画面 / 情绪留白可在此之上取更长档位，但台词永不把时长压到念不完的短档，utterances 为空（纯画面、无口播）的场景没有此下界、按画面自行取值；若口播估算已超过最长 10 秒，取最长档即可（不删减台词、不强行压进短档），保存时会另有提示。
+- **duration_seconds**：
+  - 档位：从支持的秒数档位（4, 6, 8, 10）中按画面内容选择：默认 6 秒，打斗 / 大场面 / 情绪铺陈等画面可取更长档至 10 秒，不要默认选最短档。
+  - 口播下界：先估算该场 utterances（台词 + 画外音）念完约需的秒数（口播语速约 5 字/秒），在上述档位里取**不低于**这个秒数的最接近档位。这是单向下界，画面 / 情绪留白可在此之上取更长档位；utterances 为空的分镜没有此下界；若口播估算已超过最长 10 秒，取最长档即可，不删减台词。
+- **segment_break**：改编时自行判断：地点 / 时间跳转或场景切换后的第一个分镜标「是」，同一时空内的后续分镜标「否」。
 - **characters_in_scene** / **scenes** / **props**：从下列候选中列出此分镜实际出现的资产。
   - 候选 characters：[姜月茴, 姜月茴/病中, 沈管家, 老人甲]
   - 候选 scenes：[祠堂]
   - 候选 props：[玉佩, 怀表]
-  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不登记为角色资产、不进 characters_in_scene。
+  - 不要发明候选之外的名称；泛指群演（如「老人甲」「村民若干」）不进 characters_in_scene。
 - **scene_description**：改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合画面呈现。以本分镜当下的单一时空落笔——原文的回忆、闪回、心理活动，改编为此刻可见的载体（人物神态、手中物件、环境痕迹）；这段描述是后续单帧分镜画面的内容来源。**台词 / 画外音不要写进这里**——口播统一落在 utterances。
 
 ## 逐字内容（内容真相源，定稿后原样保留、不再改写）
 
 - **source_text**：逐字摘录本分镜对应的原文片段，尽量与原文一致、宁缺毋造（无把握可留空）。
-- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）——是否产出由你依语境创作判断，自然需要则产出。分镜无口播则留空。
+- **utterances**：按口播出现顺序产出发声序列，台词（dialogue）的 speaker 必须出现在 characters_in_scene。叙述、心理独白等不靠画面演出的内容，可按剧情语境判断写为画外音（voiceover）。分镜无口播则留空。
 
 每个分镜应为一个独立的视觉画面、可在指定时长内完成；避免在一个分镜内安排多个动作或画面切换。

### [DIFF] prompt_authoring 全量：资产含衍生与多行描述与脏数据、9:16、附加指令  （builder 3766 字符 → 模版 3528 字符）
--- builder（现状）
+++ template（原型）
@@ -1,11 +1,9 @@
 # 角色与任务
 
-你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要改写或重述口播、不要新增 / 删除 / 重排分镜、不要改动分镜内容**——只按 scene_id 逐条产出视觉字段。
-你的任务：基于下方已定稿的「分镜内容」，为每个 scene_id 逐条产出视觉层 JSON（image_prompt / video_prompt）。
+你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要新增 / 删除 / 重排分镜、不要改动分镜内容。**
 
 **输出语言**：所有字符串值必须使用 中文；JSON 键名 / 枚举值保持英文。
 **结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
-**对齐约束**：每个分镜产出一条视觉层，`scene_id` 必须与下方内容逐字一致、不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 
 分集节奏（短剧体裁建议）：
 - 开篇 ~4 秒承担钩子职能：用强冲击 / 悬念 / 危机切入，避免介绍性远景。
@@ -68,7 +66,7 @@
 </shots>
 
 <episode_constraints>
-当前正在生成第 1 集。每条视觉层的 scene_id 必须逐字等于上方分镜内容里的 scene_id；若该 ID 含拆分/编辑后缀（如 `_1`），也必须原样保留，不得改写、合并或新增。
+当前正在生成第 1 集。每个分镜产出一条视觉层，`scene_id` 必须逐字等于上方分镜内容里的 scene_id（含拆分 / 编辑后缀，如 `_1`），不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 </episode_constraints>
 
 # 字段写作指引
@@ -91,14 +89,12 @@
 - **video_prompt.action**：首帧画面已定格主体、场景与风格，这段文字驱动它动起来：只描述该时长内发生的运动与变化，不复述画面中的静态内容；镜头运动专由 camera_motion 字段承载，action 只写主体与环境的运动。按主体动作（肢体 / 手势 / 表情过渡）、物件互动（摩挲信纸、推门带起的气流等）、环境动态（衣摆、尘埃、雨势、光影移动）分层写成连贯叙述句；动词应描述物理可观察动作（伸手 / 转身 / 摩挲 / 投向 / 收紧），避免内心动词。优先低缓、连贯的细微动作，动作量与该分镜时长匹配：5 秒级分镜通常完成一个连贯动作 + 一个细节互动；8 秒级可承载一次动作过渡（如「抬头—对视—开口」）；更长的分镜保持单一低缓的动作主线，随时长递增动作段数（如「起身—走到窗前—驻足」），而非叠加多条并行动作。
    正例：「林清缓缓抬起头，眼角微微收紧，手指无意识地摩挲信纸边缘；窗外雨势渐大，桌面投下的雨痕影子在缓慢移动。」——主体动作、物件互动、环境动态各有一笔。
    反例：「林清像蝴蝶般飞舞，思绪在过去与现在之间快速切换。」——「思绪切换」不是可拍摄的运动；「像蝴蝶般」是修辞，不是动作描述。
-   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长，而误判在异步生成阶段才报错——任务已排队、已计费。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
-- **video_prompt.camera_motion**：按画面内容自行选择。
+   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
 - **video_prompt.ambiance_audio**：只描写画内音（diegetic sound）：环境声、脚步、物体声响。不要写 BGM、配乐、画外音、旁白。
 
 # 创作目标
 
 输出可直接驱动 AI 图像 / 视频生成的、视觉一致、节奏紧凑的视觉层。忠于已定稿的分镜内容与戏剧张力。
 
-
 # 附加指令
-镜头贴近人物。+镜头贴近人物。

### [DIFF] prompt_authoring 无资产块：三者皆 None、16:9、无附加指令  （builder 3470 字符 → 模版 3232 字符）
--- builder（现状）
+++ template（原型）
@@ -1,11 +1,9 @@
 # 角色与任务
 
-你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要改写或重述口播、不要新增 / 删除 / 重排分镜、不要改动分镜内容**——只按 scene_id 逐条产出视觉字段。
-你的任务：基于下方已定稿的「分镜内容」，为每个 scene_id 逐条产出视觉层 JSON（image_prompt / video_prompt）。
+你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要新增 / 删除 / 重排分镜、不要改动分镜内容。**
 
 **输出语言**：所有字符串值必须使用 中文；JSON 键名 / 枚举值保持英文。
 **结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
-**对齐约束**：每个分镜产出一条视觉层，`scene_id` 必须与下方内容逐字一致、不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 
 分集节奏（短剧体裁建议）：
 - 开篇 ~4 秒承担钩子职能：用强冲击 / 悬念 / 危机切入，避免介绍性远景。
@@ -48,7 +46,7 @@
 </shots>
 
 <episode_constraints>
-当前正在生成第 1 集。每条视觉层的 scene_id 必须逐字等于上方分镜内容里的 scene_id；若该 ID 含拆分/编辑后缀（如 `_1`），也必须原样保留，不得改写、合并或新增。
+当前正在生成第 1 集。每个分镜产出一条视觉层，`scene_id` 必须逐字等于上方分镜内容里的 scene_id（含拆分 / 编辑后缀，如 `_1`），不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 </episode_constraints>
 
 # 字段写作指引
@@ -71,8 +69,7 @@
 - **video_prompt.action**：首帧画面已定格主体、场景与风格，这段文字驱动它动起来：只描述该时长内发生的运动与变化，不复述画面中的静态内容；镜头运动专由 camera_motion 字段承载，action 只写主体与环境的运动。按主体动作（肢体 / 手势 / 表情过渡）、物件互动（摩挲信纸、推门带起的气流等）、环境动态（衣摆、尘埃、雨势、光影移动）分层写成连贯叙述句；动词应描述物理可观察动作（伸手 / 转身 / 摩挲 / 投向 / 收紧），避免内心动词。优先低缓、连贯的细微动作，动作量与该分镜时长匹配：5 秒级分镜通常完成一个连贯动作 + 一个细节互动；8 秒级可承载一次动作过渡（如「抬头—对视—开口」）；更长的分镜保持单一低缓的动作主线，随时长递增动作段数（如「起身—走到窗前—驻足」），而非叠加多条并行动作。
    正例：「林清缓缓抬起头，眼角微微收紧，手指无意识地摩挲信纸边缘；窗外雨势渐大，桌面投下的雨痕影子在缓慢移动。」——主体动作、物件互动、环境动态各有一笔。
    反例：「林清像蝴蝶般飞舞，思绪在过去与现在之间快速切换。」——「思绪切换」不是可拍摄的运动；「像蝴蝶般」是修辞，不是动作描述。
-   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长，而误判在异步生成阶段才报错——任务已排队、已计费。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
-- **video_prompt.camera_motion**：按画面内容自行选择。
+   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
 - **video_prompt.ambiance_audio**：只描写画内音（diegetic sound）：环境声、脚步、物体声响。不要写 BGM、配乐、画外音、旁白。
 
 # 创作目标

### [DIFF] prompt_authoring 空资产块：三者皆空 dict（块仍渲染、显示暂无）、4:3  （builder 3604 字符 → 模版 3366 字符）
--- builder（现状）
+++ template（原型）
@@ -1,11 +1,9 @@
 # 角色与任务
 
-你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要改写或重述口播、不要新增 / 删除 / 重排分镜、不要改动分镜内容**——只按 scene_id 逐条产出视觉字段。
-你的任务：基于下方已定稿的「分镜内容」，为每个 scene_id 逐条产出视觉层 JSON（image_prompt / video_prompt）。
+你是一位资深的短剧分镜摄影 / 动作设计师。下方分镜内容（分镜边界、出场资产、逐字口播、原文锚、视觉改编描述）均已定稿，你的唯一职责是为每个分镜补全视觉生产层：image_prompt（画面）与 video_prompt（动作 / 运镜 / 环境音）。**不要新增 / 删除 / 重排分镜、不要改动分镜内容。**
 
 **输出语言**：所有字符串值必须使用 日本語；JSON 键名 / 枚举值保持英文。
 **结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
-**对齐约束**：每个分镜产出一条视觉层，`scene_id` 必须与下方内容逐字一致、不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 
 分集节奏（短剧体裁建议）：
 - 开篇 ~4 秒承担钩子职能：用强冲击 / 悬念 / 危机切入，避免介绍性远景。
@@ -62,7 +60,7 @@
 </shots>
 
 <episode_constraints>
-当前正在生成第 1 集。每条视觉层的 scene_id 必须逐字等于上方分镜内容里的 scene_id；若该 ID 含拆分/编辑后缀（如 `_1`），也必须原样保留，不得改写、合并或新增。
+当前正在生成第 1 集。每个分镜产出一条视觉层，`scene_id` 必须逐字等于上方分镜内容里的 scene_id（含拆分 / 编辑后缀，如 `_1`），不增不减不改；不要输出口播 / 时长 / 资产等非视觉字段。
 </episode_constraints>
 
 # 字段写作指引
@@ -85,8 +83,7 @@
 - **video_prompt.action**：首帧画面已定格主体、场景与风格，这段文字驱动它动起来：只描述该时长内发生的运动与变化，不复述画面中的静态内容；镜头运动专由 camera_motion 字段承载，action 只写主体与环境的运动。按主体动作（肢体 / 手势 / 表情过渡）、物件互动（摩挲信纸、推门带起的气流等）、环境动态（衣摆、尘埃、雨势、光影移动）分层写成连贯叙述句；动词应描述物理可观察动作（伸手 / 转身 / 摩挲 / 投向 / 收紧），避免内心动词。优先低缓、连贯的细微动作，动作量与该分镜时长匹配：5 秒级分镜通常完成一个连贯动作 + 一个细节互动；8 秒级可承载一次动作过渡（如「抬头—对视—开口」）；更长的分镜保持单一低缓的动作主线，随时长递增动作段数（如「起身—走到窗前—驻足」），而非叠加多条并行动作。
    正例：「林清缓缓抬起头，眼角微微收紧，手指无意识地摩挲信纸边缘；窗外雨势渐大，桌面投下的雨痕影子在缓慢移动。」——主体动作、物件互动、环境动态各有一笔。
    反例：「林清像蝴蝶般飞舞，思绪在过去与现在之间快速切换。」——「思绪切换」不是可拍摄的运动；「像蝴蝶般」是修辞，不是动作描述。
-   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长，而误判在异步生成阶段才报错——任务已排队、已计费。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
-- **video_prompt.camera_motion**：按画面内容自行选择。
+   避开任务类型触发词：不要用「增加 / 删除 / 去掉 / 修改 / 替换 / 改成 / 延长 / 续写」这类祈使动词。部分模型按 prompt 措辞判定任务类型，带这些词会把参考生视频误判成视频编辑或视频延长。直接描述目标画面本身即可：不写「把外套改成红色」，写「她穿着红色外套」。
 - **video_prompt.ambiance_audio**：只描写画内音（diegetic sound）：环境声、脚步、物体声响。不要写 BGM、配乐、画外音、旁白。
 
 # 创作目标

==============================================================================
9 个用例有差异 / 共 9 个（差异为预期：措辞收敛项，逐 hunk 对号见 README）
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
信息：text/bad: 引用了不存在的片段 'nope'（期望文件 /Users/pollochen/MyProjects/ArcReel-Workspace/ArcReel/.worktrees/prototype-2460/lib/prompt_templates_prototype/fixtures_bad/unknown_partial/partials/nope.md）

### 3b 变体片段族拼错：variant("script_plan_tsak", …)（族目录不存在）
报错时机：加载期；族目录不存在或为空即报错
异常：lib.prompt_templates_prototype.engine.UnknownPartial
信息：text/bad: 引用了不存在的变体片段族 'script_plan_tsak'（期望目录 /Users/pollochen/MyProjects/ArcReel-Workspace/ArcReel/.worktrees/prototype-2460/lib/prompt_templates_prototype/fixtures_bad/unknown_variant_family/partials/script_plan_tsak/ 下至少一个 <轴值>.md）

### 3c 对照：族存在但该轴值无文件——variant("text/drama_script_plan/task", "bogus")
报错时机：不报错——按 Spec「不存在的变体即为空」渲染为空串；调用方回落未知 source_kind 到 novel 是槽位值生产者的事
（未报错）返回：''…

### 3d 渲染期兜底：片段名由表达式动态拼出、静态扫描扫不到时
报错时机：渲染期；正则只扫字面量片段名，动态拼名只能靠渲染期兜底
异常：lib.prompt_templates_prototype.engine.UnknownPartial
信息：渲染期引用了不存在的片段 'nope'（期望文件 /Users/pollochen/MyProjects/ArcReel-Workspace/ArcReel/.worktrees/prototype-2460/lib/prompt_templates_prototype/templates/partials/nope.md）

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
信息：模版 id 'text/bad' 重复：/Users/pollochen/MyProjects/ArcReel-Workspace/ArcReel/.worktrees/prototype-2460/lib/prompt_templates_prototype/fixtures_bad/duplicate_id/text/a.md 与 /Users/pollochen/MyProjects/ArcReel-Workspace/ArcReel/.worktrees/prototype-2460/lib/prompt_templates_prototype/fixtures_bad/duplicate_id/text/b.md

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
│ 引用的片段（15，按首次引用顺序；变体族展开为全部轴值）
│   text/drama_script_plan/task/novel            你的任务是将小说原文**改编**为结构化的分镜内容（含视…
│   text/drama_script_plan/task/screenplay       你的任务是从作者已写好的剧本中**提取**结构化的分镜内…
│   text/drama_script_plan/language_rule/novel   例外（逐字保留、不翻译）：资产引用字段（`charact…
│   text/drama_script_plan/language_rule/screenplay 例外（逐字保留原文、不翻译、不改写）：资产引用字段（`c…
│   shared/pacing/drama                          分集节奏（短剧体裁建议）：…
│   shared/asset_name_bullets                    {% for name in names %}…
│   shared/episode_outline_lines                 {% if outline.story_beats %}…
│   shared/episode_target_duration_rule          本集成片目标时长约 {{ episode_target_…
│   text/drama_script_plan/break_rule/novel      改编时自行判断：地点 / 时间跳转或场景切换后的第一个分…
│   text/drama_script_plan/break_rule/screenplay 沿用剧本自带的场次 / 场景切换：场次变更（地点 / 时…
│   shared/asset_name_candidates                 {% if names %}{{ names | joi…
│   text/drama_script_plan/scene_rule/novel      改编后的视觉化描述：角色动作、神态、环境、光影氛围，适合…
│   text/drama_script_plan/scene_rule/screenplay 把作者写下的运镜、景别、舞台提示、视觉场面转写为画面视觉…
│   text/drama_script_plan/utterances_rule/novel 按口播出现顺序产出发声序列，台词（dialogue）的 …
│   text/drama_script_plan/utterances_rule/screenplay 把作者写下的台词与画外音**逐字照搬**为有序发声序列，…
│
│ 输出结构（response_schema：lib.script_models:DramaNormalizedScript，折叠；枚举值只在这里可见）
│   title                                    string                       剧集标题
│   scenes                                   list[object]                 分镜内容列表
│   scenes[].scene_id                        string                       分镜 ID，格式 E{集}S{序号} 或 E{集}S{序号}_{子序号}
│   scenes[].duration_seconds                integer                      分镜时长（秒）
│   scenes[].segment_break                   boolean                      是否为场景切换点
│   scenes[].characters_in_scene             list[string]                 出场角色名称列表
│   scenes[].scenes                          list[string]                 出场场景名称列表
│   scenes[].props                           list[string]                 出场道具名称列表
│   scenes[].scene_description               string                       分镜视觉改编描述（自由文本，仅承载视觉内容，供 prompt_authoring 生成视觉层）
│   scenes[].utterances                      list[object]                 分镜级有序发声序列：角色台词（dialogue）与画外音（voiceover）按时序排列，逐字保留
│   scenes[].utterances[].kind               enum dialogue/voiceover      发声类型：dialogue=带角色归属的角色发声、voiceover=无角色归属的叙述旁白
│   scenes[].utterances[].speaker            string | null                说话角色名；dialogue 必填非空、voiceover 必须为 null
│   scenes[].utterances[].text               string                       发声内容原文，逐字保留
│   scenes[].source_text                     string                       逐字原文摘录（追溯锚，不朗读、不出音，best-effort）
│
│ 源文（槽位与片段引用以标记呈现，页面上可展开片段正文）
│ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
│ {{ variant("text/drama_script_plan/task", source_kind) }}
│ 
│ **输出语言**：自然语言字符串值必须使用 {{ target_language }}；JSON 键名 / 枚举值保持英文。{{ variant("text/drama_script_plan/language_rule", source_kind) }}
│ **结构约束**：字段 / 枚举 / 必填项由 response_schema 强制；本提示只解释**如何写好每个字段的内容**。
│ 
│ {{ partial("shared/pacing/drama") }}
│ 
│ ## 项目信息
│ 
│ <overview>
│ {{ project_overview.synopsis }}
│ 
│ ……
└──────────────────────────────────────────────────────────────────────┘

┌─ 模版详情（节选：只看输出结构） ───────────────────────────────────────┐
│ 剧情演绎 · 提示词编写
│ 输出结构（response_schema：lib.script_models:DramaVisualScript）——shot_type / camera_motion 的枚举值只在这里
│   title                                    string                       剧集标题（可选，最终以 script_plan 内容为准）
│   scenes                                   list[object]                 各分镜视觉层（按 scene_id 对齐 script_plan 内容）
│   scenes[].scene_id                        string                       对齐锚：必须等于 script_plan 已定分镜的 scene_id
│   scenes[].image_prompt                    object                       分镜图生成提示词
│   scenes[].image_prompt.scene              string                       画面静态描述；动态内容由 video_prompt.action 承载
│   scenes[].image_prompt.composition        object                       构图信息
│   scenes[].image_prompt.composition.shot_type enum Extreme Close-up/Close-up/Medium Close-up/Medium Shot/Medium Long Shot/Long Shot/Extreme Long Shot/Over-the-shoulder/Point-of-view 镜头类型
│   scenes[].image_prompt.composition.lighting string                       光线描述
│   scenes[].image_prompt.composition.ambiance string                       整体氛围
│   scenes[].video_prompt                    object                       视频生成提示词（无 dialogue，口播在 script_plan utterances）
│   scenes[].video_prompt.action             string                       该分镜时长内的动作描述；镜头运动由 camera_motion 承载
│   scenes[].video_prompt.camera_motion      enum Static/Pan Left/Pan Right/Tilt Up/Tilt Down/Zoom In/Zoom Out/Push In/Pull Out/Truck Left/Truck Right/Pedestal Up/Pedestal Down/Orbit/Tracking Shot/Shake 镜头运动
│   scenes[].video_prompt.ambiance_audio     string                       环境音效（画内音）
└──────────────────────────────────────────────────────────────────────┘
```
