# 多市场源 GitHub 仓库市场的既有实践：Claude Code / MoviePilot / Obsidian / HACS / LobeChat

> 调研日期：2026-09-14。
> 服务对象：https://github.com/ArcReel/ArcReel/issues/2449 （地图 https://github.com/ArcReel/ArcReel/issues/2448 ）。
> 范围：只采信一手来源——官方文档站、仓库源码、索引文件本体与实测 HTTP 响应。博客、教程站、二手转述一律不采。
> 结论标记：官方没有明说、源码中也查不到的，一律写「未验证」，不以推断顶替。
> 五家在本文中的简称：Claude Code（plugin marketplaces）、MoviePilot、Obsidian、HACS、LobeChat。

---

## 一、结论速览

| 问题 | 一句话结论 |
| --- | --- |
| 1 索引格式与位置 | 五家都是「仓库内的单一 JSON 文件」，差异在于索引里放多少。Claude Code 的 `.claude-plugin/marketplace.json` 把 source 指针写全（七种源类型）；MoviePilot 的 `package.v3.json` 以插件 ID 为 key、带版本与更新日志；Obsidian 的 `community-plugins.json` 每条只有五个字段且**不含版本**；HACS 的 `hacs/default/<category>` 只是一个 `owner/repo` 字符串数组，元数据全在被收录仓自身的 `hacs.json`；LobeChat 的 `index.json` 是 CI 构建产物、不进 git。多语言描述只有 LobeChat 有。 |
| 2 市场源地址书写 | Claude Code 最宽（`owner/repo`、任意 git URL、本地路径、直链 JSON，`@ref` / `#ref` 钉版本）；MoviePilot 用逗号分隔的完整 GitHub URL，且硬白名单只认 `github.com`；HACS 用正则把任意形态归一成 `owner/repo`，另需选 category，明确不支持非 GitHub；LobeChat 只有一个环境变量、只能配一个完整 URL；Obsidian 根本没有「添加市场源」这个概念。 |
| 3 客户端抓取路径 | 三条路线：git clone（Claude Code）、raw 加 GitHub Contents / Releases API（MoviePilot、Obsidian）、预聚合 CDN（HACS 的 `data-v2.hacs.xyz`、LobeChat 的 npmmirror）。限流是分水岭：走 API 的必须处理 token，走 CDN 的绕开限流。 |
| 4 大陆可达性 | 只有两家真正做了事，思路完全不同。MoviePilot 用 `GITHUB_PROXY` 前缀拼接，但镜像只对 raw 生效、API 请求不走镜像；LobeChat 把索引发成 npm 包，默认地址直接指向 `registry.npmmirror.com`，免运营。Claude Code 只有离线与气隙方案，无镜像。Obsidian 与 HACS 官方完全未涉及。 |
| 5 更新检测 | 要么比版本号，要么不做。MoviePilot 用自定义数字段比较；Obsidian 比远端 `manifest.json` 的 `version`；HACS 有 Release 比 tag、无 Release 比 commit 前七位 sha；Claude Code 把「版本」定义成一条可回退的解析链。LobeChat 的 legacy 索引没有 `updatedAt`，也没有「已安装」概念，完全不做。 |
| 6 信任与投稿审核 | 信任提示的落点不同：Claude Code 与 HACS 放在「添加源」与「安装」这一层并配企业策略或强制勾选免责；MoviePilot 下沉到「安装单个插件并绑定来源」，用 TOFU 首次信任绑定；Obsidian 与 LobeChat 在源这一层没有提示。审核全部是「CI 自动校验加人工 merge」。下架都靠从索引删条目，但 Obsidian 与 HACS 额外保留**移除留痕文件**，Claude Code 用 `renames` 映射到 `null`。 |

---

## 二、索引文件的格式与位置

### Claude Code

索引是市场仓根目录下的 `.claude-plugin/marketplace.json`。顶层必填 `name`（kebab-case，公开可见，用户按 `plugin@marketplace-name` 安装）、`owner`、`plugins`；可选 `description`、`version`、`metadata.pluginRoot`、`allowCrossMarketplaceDependenciesOn`、`renames`。
https://code.claude.com/docs/en/plugin-marketplaces#marketplace-schema

条目必填 `name` 与 `source`，可选 `displayName`、`description`、`version`、`author`、`homepage`、`repository`、`license`、`keywords`、`category`、`tags`、`strict`、`defaultEnabled`，以及组件覆盖字段与归档鉴权字段 `headers` / `headersHelper`。

`source` 是这套设计里最值得注意的一处：它有七种形态，条目并不局限于「同仓相对路径」。
https://code.claude.com/docs/en/plugin-marketplaces#plugin-sources

| source 形态 | 写法 | 说明 |
| --- | --- | --- |
| 相对路径 | `"./my-plugin"` | 相对**市场根**解析，不是相对索引文件所在目录 |
| `github` | `{repo, ref?, sha?}` | |
| `url` | `{url, ref?, sha?}` | 任意 git URL，GitLab、Bitbucket、自建均可 |
| `git-subdir` | `{url, path, ref?, sha?}` | monorepo 子目录，用 sparse partial clone 省带宽 |
| `npm` | `{package, version?, registry?}` | |
| `archive` | `{url, sha256?}` | HTTPS zip，无需 git 或 npm |
| `command` | `{command, timeout?, mode?}` | 本地命令产出插件目录，每会话重跑一次 |

版本号来自一条**回退链**，不是单一来源：插件自身 `plugin.json` 的 `version`，其次索引条目的 `version`，再次 git 源已解析的 commit SHA，再次 `archive` 源的 SHA-256 前十二位，最后是 `unknown`。
https://code.claude.com/docs/en/plugins-reference#version-management

官方市场 `anthropics/claude-plugins-official` 实测 296 条。顶层键只有 `$schema`、`name`、`description`、`owner`、`renames`、`plugins`；source 分布为 `url` 155 条、`git-subdir` 89 条、相对路径 52 条；`category` 用了 282 条，而 `version` 只有 14 条，绝大多数条目故意不写版本，让 commit SHA 充当版本。
https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json

```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "claude-plugins-official",
  "owner": { "name": "Anthropic", "email": "support@anthropic.com" },
  "renames": { "adlc": "agentforce-adlc", "convex-backend": "convex" },
  "plugins": [
    {
      "name": "42crunch-api-security-testing",
      "author": { "name": "42Crunch" },
      "category": "security",
      "source": {
        "source": "git-subdir",
        "url": "https://github.com/42Crunch-AI/claude-plugins.git",
        "path": "plugins/api-security-testing",
        "ref": "v1.5.5",
        "sha": "30287f5e3f122a646d1ac5ca3ab96e130c52a3ad"
      },
      "homepage": "https://42crunch.com"
    }
  ]
}
```

多语言描述：官方文档中不存在 locale 或 i18n 相关字段，**未验证**。

另有一条与「冒充官方」直接相关的机制：一批市场名被保留给官方（`claude-plugins-official`、`anthropic-marketplace`、`claude-community` 等），形如 `official-claude-plugins` 的冒充名同样被拒，并且**每次加载市场都会重新检查**，不只是添加时。

### MoviePilot

索引在插件仓根目录，三代并存：`package.json`、`package.v2.json`、`package.v3.json`，分别对应目录 `plugins/`、`plugins.v2/`、`plugins.v3/`。
https://github.com/jxxghp/MoviePilot-Plugins/blob/main/README.md

整份文件是一个 JSON 对象，**key 就是插件 ID**（大驼峰，等于插件主类名），条目内没有独立的 `id` 字段。实测 `package.v3.json` 31 条、`package.v2.json` 69 条、`package.json` 79 条。
https://raw.githubusercontent.com/jxxghp/MoviePilot-Plugins/main/package.v3.json

条目指向代码目录靠命名约定：`plugins.v3/<插件 ID 全小写>/__init__.py`，主类名必须等于目录名的大驼峰形式。CI 脚本用 `PACKAGE_PLUGIN_DIRS` 把索引文件映射到目录。
https://github.com/jxxghp/MoviePilot-Plugins/blob/main/.github/scripts/check_plugin_versions.py

字段：`name`、`description`、`labels`、`version`、`icon`、`author`、`level`、`system_version`（pip 风格约束，如 `">=3.0.0"`）、`history`（更新日志对象，key 为 `vX.Y.Z`）、`release`（是否走 GitHub Release zip 发布）、`v2` 与 `v3`（跨代可用性开关）。
https://github.com/jxxghp/MoviePilot-Plugins/blob/main/docs/Repository_Guide.md

版本号写在三处并由 CI 强制一致：索引条目的 `version`、插件类的 `plugin_version`、`history` 的首项。

```json
{
  "ShortCutModified": {
    "name": "修改版快捷指令",
    "description": "IOS快捷指令，快速选片添加订阅。",
    "labels": "站点,仪表板",
    "version": "3.0.2",
    "icon": "https://raw.githubusercontent.com/Sinterdial/MoviePilot-Plugins/main/icons/shortcut.png",
    "author": "Sinterdial, honue",
    "level": 1,
    "release": true,
    "system_version": ">=3.0.0",
    "history": {
      "v3.0.2": "适配v3标准，使用media_source+media_id，优化了使用逻辑",
      "v3.0.1": "迁移至v3，使用SDK加载模块"
    }
  }
}
```

多语言描述：索引中不存在任何 i18n 结构，后端直接透传单一中文字符串。
https://github.com/jxxghp/MoviePilot/blob/main/app/runtime/extensions/plugin/metadata.py

### Obsidian

索引是 `obsidian-releases` 仓库根目录的 `community-plugins.json`。这里有个影响后续各问的前提性发现：投稿机制已在 2026 年迁移，入口从「向该仓提 PR」改为 community.obsidian.md 的网页表单加自动扫描器，仓库里这份文件现在只是一个**下游镜像**，由定时 workflow 从 `https://community.obsidian.md/assets/community-plugins.json` 拉取覆盖。PR 模板与校验 action 已于 2026-05-15 的提交 `d4f0694` 删除。
https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/mirror-community-json.yml

实测镜像 7625 条、上游 7631 条，每条恰好五个键，无额外键：

```json
[
  {
    "id": "obsidian-git",
    "name": "Git",
    "author": "Vinzent",
    "description": "Integrate Git version control with automatic backup and other advanced features.",
    "repo": "vinzent03/obsidian-git"
  }
]
```

索引里**确实不含版本号**，也不含下载地址与最低版本要求。索引字段的唯一用途是搜索：「The `name`, `author` and `description` fields are used for searching.」版本来自各插件仓默认分支根目录的 `manifest.json`，文件本体来自该仓的 GitHub Release。
https://github.com/obsidianmd/obsidian-releases/blob/master/README.md

`manifest.json` 必填 `author`、`minAppVersion`、`name`、`version`（semver）、`id`、`description`、`isDesktopOnly`，可选 `authorUrl`、`fundingUrl`。`id` 只允许小写字母与连字符、不能以 `plugin` 结尾、不能含 `obsidian`。
https://docs.obsidian.md/Reference/Manifest

多语言描述：索引与 manifest 的 schema 中均无 locale 结构，**不支持**。

另有三个衍生文件值得注意：`community-plugin-stats.json`（下载量与更新时间）、`community-plugins-removed.json`（移除留痕，条目为 `{id, name, reason}`）、`community-plugin-deprecation.json`（插件 id 到被废弃版本号数组的映射，即 deprecation 是**版本级而非条目级**）。

### HACS

HACS 是唯一一家把索引拆成三层的。

第一层是 `hacs/default` 仓库根目录按类别各一个**无扩展名**文件（`integration`、`plugin`、`theme`、`appdaemon`、`python_script`、`template`、`netdaemon`）。内容不是「每行一个 owner/repo」的纯文本，而是**一个 JSON 字符串数组**，按字母序排列。`integration` 实测 3262 条。
https://github.com/hacs/default/blob/master/integration

```json
[
  "007hacky007/car_maintenance",
  "0jety0/emaux_spv150",
  "0xAHA/airtouch4_advanced"
]
```

同目录还有三个治理用 JSON：`removed`（下架记录，含 `repository`、`removal_type`、`reason`、`link`）、`critical`（安全事故）、`blacklist`。

第二层是被收录仓库自身根目录的 `hacs.json`，唯一必填是 `name`。可选 `content_in_root`、`zip_release`、`filename`、`hide_default_branch`、`country`、`homeassistant`（最低 HA 版本）、`hacs`（最低 HACS 版本）、`persistent_directory`。源码的 voluptuous schema 用 `extra=vol.PREVENT_EXTRA`，未知字段直接报错，且比文档多一个 `render_readme`。
https://hacs.xyz/docs/publish/start/ ，https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py

第三层是官方预生成的聚合 JSON，结构为 `https://data-v2.hacs.xyz/<section>/<type>.json`。`integration/data.json` 实测 2.1 MB、3243 条，**以 GitHub 仓库数字 ID 为 key**：
https://hacs.xyz/docs/faq/data_sources/

```json
"377060365": {
  "manifest": { "country": ["RU"], "name": "Личный кабинет Интер РАО" },
  "description": "Интеграция Home Assistant",
  "domain": "lkcomu_interrao",
  "etag_releases": "W/\"b2dc61c18a894\"",
  "full_name": "alryaz/hass-lkcomu-interrao",
  "last_commit": "644c7c8",
  "last_version": "v2025.12.0",
  "last_fetched": 1784784855.855042
}
```

版本来源有明确的二分：有 GitHub Release（必须是 release，不能只打 tag）就用最新 release 的 tag name；没有就用最后一次 commit 的**前七位 sha**。

多语言描述：`hacs.json` 没有 description 字段，UI 里显示的描述直接取自 GitHub 仓库 description，单一语言；`name` 也是单值。HACS 前端自身的 UI 文案只有 `en.json` 一个语言文件。**不支持**。

### LobeChat

LobeChat 的做法与其余四家都不同：**仓库里没有 `index.json`**。仓库只有 `src/`（agent 源文件）、`locales/`（各语言译文）、`schema/`。`index.json` 是 CI 构建产物，写进 gitignore 的 `public/`，再作为 **npm 包**发布（`@lobehub/agents-index`，`"main": "public/index.json"`）。
https://github.com/lobehub/lobe-chat-agents/blob/main/scripts/core/constants.ts ，https://github.com/lobehub/lobe-chat-agents/blob/main/package.json

索引结构是 `{...meta, agents, tags}`，其中 `meta.json` 只有 `{"schemaVersion": 1}`：

```json
{"schemaVersion":1,"agents":[{"author":"CSY2022","createdAt":"2025-06-19","homepage":"https://github.com/CSY2022","identifier":"lateral-thinking-puzzle","knowledgeCount":0,"meta":{"avatar":"🐢","description":"A turtle soup host needs to provide the scenario","tags":["Turtle Soup","Reasoning"],"title":"Turtle Soup Host","category":"games"},"pluginCount":0,"schemaVersion":1,"tokenUsage":1531}]}
```

条目指向内容的方式，agents 与 plugins 完全不同：

- **agents 不带任何路径或 URL 字段**，靠 `identifier` 拼路径，详情文件与索引文件**平铺在同一目录**（`public/<identifier>.json`、`public/<identifier>.zh-CN.json`）。
- **plugins 条目带 `manifest` 字段，是完整的第三方 URL**，插件内容托管在作者自己的域名上。

```json
{"identifier":"ShoppingTools","manifest":"https://openai-collections.chat-plugin.lobehub.com/shopping-tools/manifest.json","meta":{"title":"Shopping tools","category":"tools"},"schemaVersion":1}
```

版本：`schemaVersion` 恒为 1，是**索引格式版本**而非内容版本；`createdAt` 只记首次创建，**没有 `updatedAt`**；没有语义版本。仓库自身有 npm 语义版本，但那是整包版本。

多语言是这家唯一真正做了的一环。语言清单定义在仓库根的 `.i18nrc.js` 的 `outputLocales`，agents 侧 18 种，`entryLocale` 为 `en-US`。构建产出**每种语言一份索引加每种语言一份详情**，entryLocale 无后缀、其余带后缀：
https://github.com/lobehub/lobe-chat-agents/blob/main/.i18nrc.js ，https://github.com/lobehub/lobe-chat-agents/blob/main/scripts/utils/file.ts

```ts
export const getBuildLocaleAgentFileName = (id: string, locale?: string): string => {
  const formatedLocale = normalizeLocale(locale);
  const localeSuffix = formatedLocale === config.entryLocale ? '' : `.${formatedLocale}`;
  return id + localeSuffix + '.json';
};
```

仓库内源文件是两层：`src/<id>.json`（英文正本加完整 config）与 `locales/<id>/index.<locale>.json`（仅译文片段），构建期合并。译文由 **CI 用 LLM 自动生成**（`modelName: 'gpt-4.1-nano'`，`concurrency: 18`），翻译字段由 `selectors` 限定为 `meta.title`、`meta.description`、`meta.tags`、`config.systemRole` 等，随后由机器人提交「Auto format and add i18n json files」。
https://github.com/lobehub/lobe-chat-agents/blob/main/scripts/processors/i18n-processor.ts

---

## 三、市场源地址的书写与解析

### Claude Code

命令是 `/plugin marketplace add <source>`（可简写 `/plugin market add`），Shell 版为 `claude plugin marketplace add <source>`。可写四类形式：GitHub 简写 `owner/repo`；任意 git URL（含 SSH 形式 `git@gitlab.com:company/plugins.git`）；本地路径（目录或直接指向 `marketplace.json`）；远程直链 `https://example.com/marketplace.json`。
https://code.claude.com/docs/en/discover-plugins#add-marketplaces

分支与 tag 用 `@ref` 或 `#ref` 后缀钉住，例如 `claude plugin marketplace add acme-corp/claude-plugins@v2.0`。注意市场源本身只支持 `ref`，**不支持 `sha`**；`sha` 只能写在条目的 `source` 里。

非 GitHub 托管的解析规则有一处坑值得记下：`github.com` 与 `gitlab.com` 带不带 `.git` 都识别为 clone；Azure DevOps 要**省略** `.git`（路径含 `/_git/` 即判为 clone）；**其他所有 host 包括自建 GitLab 必须带 `.git`**，否则会被当成直链 `marketplace.json`。必须带 `https://` 前缀，裸 host 会被拒。
https://code.claude.com/docs/en/discover-plugins#add-from-other-git-hosts

`add` 还支持 `--scope {user|project|local}` 与 `--sparse <paths...>`。配置文件里的 `extraKnownMarketplaces` 另有六种源类型：`github`、`git`、`url`（支持 `headers` / `headersHelper` 鉴权）、`file`、`directory`、`settings`（直接内联声明市场）。
https://code.claude.com/docs/en/settings-reference#extraknownmarketplaces

### MoviePilot

配置项是 `PLUGIN_MARKET`，注释写明「多个地址使用,分隔，地址以/结尾」。书写形式是**完整仓库 URL，不是 `owner/repo`**。
https://github.com/jxxghp/MoviePilot/blob/main/app/runtime/config.py

解析函数是 `normalize_plugin_market_repo_url()` 与 `split_plugin_market_repo_urls()`。分隔符实际支持换行、半角逗号与**全角逗号**；去尾斜杠与 `.git` 后缀；**仅接受 http/https 且 hostname 严格等于 `github.com`**，归一化为 `https://github.com/{owner}/{repo}`；按小写顺序去重。
https://github.com/jxxghp/MoviePilot/blob/main/app/domain/plugin.py

```python
def normalize_plugin_market_repo_url(repo_url: str) -> str | None:
    value = str(repo_url or "").strip().rstrip("/")
    value = value.removesuffix(".git")
    parsed_url = urlsplit(value)
    if parsed_url.scheme not in {"http", "https"}:
        return None
    if (parsed_url.hostname or "").lower() != "github.com":
        return None
    parts = [item for item in parsed_url.path.split("/") if item]
    if len(parts) < 2:
        return None
    return f"https://github.com/{parts[0]}/{parts[1]}"
```

非 GitHub 托管**不支持**，由上述 hostname 白名单直接拒绝；官方 Wiki 也写明仅支持 GitHub 仓库的 `main` 分支。

多源的**优先级与去重规则**是这次调研里最完整的一份，值得单独记：排序键 `repo_order` 取该仓库在 `PLUGIN_MARKET` 中的**配置下标**，未知来源排后、本地仓库排最后；先按「归一化 ID 加版本」去重，再按 ID 归并，**版本高者胜**，版本相同则配置顺序在前者胜。
https://github.com/jxxghp/MoviePilot/blob/main/app/application/plugin/catalog.py

还有一个别处没见过的机制：后端提供 `POST /api/v1/system/setting/PLUGIN_MARKET/sync-wiki`，从官方 Wiki 抓取被 `<!-- plugin-market-repos:start -->` 标记包裹的仓库清单，与本地配置合并去重后写回 `PLUGIN_MARKET`。同步地址被硬编码白名单限制（必须是 https、`raw.githubusercontent.com`、且路径匹配指定 Wiki 文件）。即**第三方源清单本身也可以是一份可订阅的上游文件**。
https://github.com/jxxghp/MoviePilot/blob/main/app/application/system.py

本地源走 `PLUGIN_LOCAL_REPO_PATHS`，以 `local://` 伪 URL 表示，不经网络。

### Obsidian

**没有「添加市场源」这个概念。** 官方只有唯一官方目录，客户端不提供注册第三方源的机制。开发者政策明确划界：「These policies only apply to plugins listed in the official Obsidian Community directory. These policies do not apply to plugins installed outside of the Obsidian directory」，即「目录外安装」是脱离目录的旁路，不是另一个可注册的源。
https://docs.obsidian.md/Community+directory/Developer+policies

第三方分发靠 BRAT，**属于社区第三方插件而非官方机制**：「While Obsidian doesn't officially support beta releases, we recommend that you use the BRAT plugin to distribute your plugin to beta testers before it's been published.」BRAT 以什么参数形式添加仓库，官方文档未描述，**未验证**。
https://docs.obsidian.md/Plugins/Releasing/Beta-testing+plugins

索引里 `repo` 字段格式为 `owner/repo`，不带前缀。mirror workflow 对此做正则校验 `^[^/[:space:]]+/[^/[:space:]]+$`，不合格即报错。提交时表单填的是完整 URL，由目录侧转成索引条目。

### HACS

对应功能叫 Custom repositories。文档的步骤是「Add the URL to the repository」加「Select the correct type」，即**完整 GitHub URL 加一个必选的 category**。
https://hacs.xyz/docs/faq/custom_repositories/

但实际解析比文档宽：后端用一条正则把任意形态归一为 `owner/repo` 并转小写，所以完整 URL、`owner/repo`、带 `.git` 后缀都能吃下。
https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/regex.py

```python
RE_REPOSITORY = re.compile(
    r"(?:(?:.*github.com.)|^)([A-Za-z0-9-]+\/[\w.-]+?)(?:(?:\.git)?|(?:[^\w.-].*)?)$"
)
```

category 是 WebSocket 命令 `hacs/repositories/add` 的必填参数，必须在已知类别集合内。

非 GitHub 托管**明确不支持**，官方 FAQ 单独成页：「Only public repositories hosted on GitHub will be compatible with HACS.」私有仓库同样完全不支持。
https://hacs.xyz/docs/faq/other_git_providers/ ，https://hacs.xyz/docs/faq/private_repositories/

添加自定义仓库时**不能指定 ref**，添加接口只有 `repository` 与 `category` 两个参数。下载时可在对话框里从 releases 列表选版本，但官方已声明该选择器将被移除：「The version selector will be removed in a future release.」无 release 时回退到默认分支。

### LobeChat

支持自定义，但**只有环境变量，没有 UI 设置项，且只能配一个**。变量是 `AGENTS_INDEX_URL` 与 `PLUGINS_INDEX_URL`，schema 为 `z.string().url()`，即必须写完整 URL，不支持 `owner/repo` 简写。
https://github.com/lobehub/lobe-chat/blob/main/packages/env/src/app.ts

解析规则是单一 baseUrl 加 `urlJoin` 拼后缀，所以给定的 URL 必须是一个**目录前缀**，目录下要摆 `index.json`、`index.<locale>.json`、`<id>.<locale>.json`。

**无法配置多个源**：`AssistantStore` 与 `PluginStore` 的构造函数只接一个 `baseUrl`。代码里的「多源」指的是 legacy 与 new 两套**代码路径**，不是可配置的 N 个 URL。

官方文档原文：「LobeHub 助手市场的索引地址，如果你自行部署了助手市场的服务，可以使用该变量来覆盖默认的市场地址」。自建索引的官方路径是 agents 仓 README 提供的 Vercel 一键部署按钮。
https://github.com/lobehub/lobe-chat/blob/main/docs/self-hosting/environment-variables/basic.zh-CN.mdx

---

## 四、客户端抓取路径

### Claude Code

git 源走**真 clone 或 pull**，不是 raw 也不是 API。`git-subdir` 用 sparse partial clone，`--sparse` 支持 git sparse-checkout。GitHub 的 `owner/repo` 简写默认走 SSH clone，设 `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` 改走 HTTPS，使用本机既有的 git credential helper 或 ssh-agent。URL 型市场直接 HTTPS 拉 `marketplace.json`，可带 `headers`，但此时相对路径插件会失败。
https://code.claude.com/docs/en/plugin-marketplaces#private-repositories

插件缓存在 `~/.claude/plugins/cache`，按「市场 / 插件 / 版本」分目录，每个版本一份独立拷贝。官方说明了为什么要拷贝而不是就地使用：「For security and verification purposes, Claude Code copies marketplace plugins to the user's local plugin cache rather than using them in place… the symlink is skipped for security. This prevents plugins from pulling arbitrary host files such as system paths into the cache.」
https://code.claude.com/docs/en/plugins-reference#plugin-cache

刷新命令是 `/plugin marketplace update [name]`。另外凡是带市场名的安装都会**先自动刷新该市场**，但有五种跳过情形：源不是远程、由 seed 目录供给、30 秒内已刷新过、设了 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、被受管设置拦截。所有 git 操作有 120 秒超时，可用 `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` 放宽。

未认证限流：官方文档全文未提及 GitHub API rate limit，**未验证**。（走 clone 而非 API 是可观察的事实，但文档没写限流处理，此处不做推断。）

### MoviePilot

不用 git clone，三条通道分工明确：

| 用途 | 通道 |
| --- | --- |
| 读索引 | `raw.githubusercontent.com/{user}/{repo}/main/package[.vN].json` |
| 遍历与下载插件目录 | GitHub Contents API `/repos/{user_repo}/contents/plugins[.vN]/{pid小写}` |
| Release zip 安装 | Releases API `/releases/tags/{tag}` 加 `/releases/assets/{id}` |

https://github.com/jxxghp/MoviePilot/blob/main/app/adapters/external/plugin/client.py ，https://github.com/jxxghp/MoviePilot/blob/main/app/adapters/system/plugin/package.py

目录遍历的做法：Contents API 返回列表，有 `download_url` 的按原始字节写盘，没有的当子目录，用**显式栈**（非递归）继续拉取。每个文件路径都过一次校验，必须以 `plugins[.vN]/{pid}/` 开头且解析后仍在目标根内，防目录穿越。

缓存 TTL 是 **1800 秒**的进程内 LRU（`@cached(maxsize=1024, ttl=1800)`），releases 列表同样 30 分钟。强制刷新时追加 `_refresh=<time_ns>` 查询参数绕过镜像与中间代理的缓存。另有进程级信号量闸门加 Future 合并，避免同一索引并发重复请求。

限流应对有**两级 token**：`GITHUB_TOKEN`（全局，注释即写「提高请求 api 限流阈值」）与 `REPO_GITHUB_TOKEN`（按仓库分配，格式 `{user}/{repo}:ghp_****,...`）。403 有专门文案「超出速率限制，请设置Github Token或稍后重试」。

索引侧还设了防护上限：单份索引不超过 1 MiB、不超过 4096 条目、单条 history 不超过 512 项、JSON 嵌套不超过 64 层、请求超时 15 秒。

### Obsidian

README 的 "How community plugins are pulled" 一节是唯一官方描述，链路是六步：读 `community-plugins.json` 的列表；用户打开详情页时从该插件仓拉 `manifest.json` 与 `README.md`；仓库里的 `manifest.json` 只用于确定最新版本；若 `minAppVersion` 高于当前 app，则查该仓根目录的 `versions.json` 找兼容的历史版本；安装时查找 **tag 与 `manifest.json` 中 version 完全相同**的 GitHub Release；下载 `main.js`、`manifest.json`、`styles.css`（若有）。
https://github.com/obsidianmd/obsidian-releases/blob/master/README.md

即**插件文件本体来自 GitHub Release 附件，不是 raw 源码**。tag 不带 `v` 前缀，官方 GitHub Actions 页给的是 `git tag -a 1.0.1 -m "1.0.1"`。
https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions

客户端读索引用的**确切 URL**：README 只说会读这份列表、未给 URL，**未验证**。已知存在两个可公开访问的副本，一个是 `obsidian-releases` 的 raw 地址，另一个是由 workflow 环境变量证实为真源的 `https://community.obsidian.md/assets/community-plugins.json`。

CDN：官方文档与仓库均未提及，**未验证**。未认证限流的处理同样**未验证**。

### HACS

列表**不打 GitHub API**，走自建 CDN。`HacsDataClient._do_request()` 固定拼接 `https://data-v2.hacs.xyz/{section}/{filename}`，60 秒超时，带 `User-Agent` 与 `If-None-Match`，304 时抛 `HacsNotModifiedException`。
https://github.com/hacs/integration/blob/main/custom_components/hacs/data_client.py

官方 FAQ 把两个数据源讲得很清楚：默认仓库的列表与元数据走 HACS Data（CDN），**自定义仓库永远走 GitHub REST API**，因为「the generator action of the HACS data does not know about it」。走 API 的场景是：启动时刷新自定义仓库、浏览某个仓库详情、点「Update information」、执行更新安装。
https://hacs.xyz/docs/faq/data_sources/

CDN 数据存在 Cloudflare R2，由 `generate-hacs-data.yml` 每 4 小时生成一次。实测响应带 `Server: cloudflare`、`ETag`、`Last-Modified`。

下载文件则是三条路径，全部**直连 github.com 或 raw.githubusercontent.com，不经 CDN**：release 附件 `https://github.com/{repo}/releases/download/{version}/{filename}`；仓库 zip 归档 `https://github.com/{repo}/archive/refs/tags/{version}.zip`（失败回退 `refs/heads/`）；单文件走 raw。
https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/url.py

限流与 token 的关系是五家里最重的：**配置流程强制走 GitHub Device Flow 登录**，拿到的 token 存进 config entry 并用于所有 GitHub API 调用。官方解释是未认证的每小时 60 次不够用，所以必须认证，使用的是**无 scope 的 OAuth token，只读公开信息**。
https://hacs.xyz/docs/faq/github_account/

限流保护还有一层配额预算：每 5 分钟检查一次 rate limit，保留 1000 次配额缓冲，用 `(remaining - 1000) / 10` 决定本轮可处理的仓库数，耗尽则整体禁用并标记原因为 `RATE_LIMIT`。定时任务节奏是每 6 小时拉 CDN 全量分类数据、每 48 小时刷新已下载的自定义仓库、每 10 分钟处理队列。

### LobeChat

默认索引 URL 是 **npmmirror（阿里云 npm 镜像）的 npm 包文件服务**，不是 raw.githubusercontent、不是 jsDelivr、也不是 lobehub 自建域名：
https://github.com/lobehub/lobe-chat/blob/main/packages/env/src/app.ts

```ts
const ASSISTANT_INDEX_URL = 'https://registry.npmmirror.com/@lobehub/agents-index/v1/files/public';
const PLUGINS_INDEX_URL  = 'https://registry.npmmirror.com/@lobehub/plugins-index/v1/files/public';
```

单测锁死了该默认值。自建域名 `chat-agents.lobehub.com` 与 `chat-plugins.lobehub.com` 仍然存在并可用，但在主仓里只剩两处残留，都不是运行时抓取路径。`registry.lobehub.com` 在三个仓库中均无任何出现，**未验证**。

抓取是**服务端代理，不是浏览器直连**：`AssistantStore` 与 `PluginStore` 位于 `apps/server/src/modules/`，由服务端调用，浏览器只跟 LobeChat 自己的服务端通信。

缓存用 Next.js 服务端缓存加 tag 失效：agents 侧 `cache: 'force-cache'`，列表 revalidate 3600 秒、详情 43200 秒；plugins 侧只有 `revalidate: 3600`。实测上游响应头，`chat-agents.lobehub.com` 是 `max-age=0, must-revalidate` 配 Vercel 缓存命中，npmmirror 因 URL 含 `v1` 版本段而是 `max-age=31536000` 不可变。
https://github.com/lobehub/lobe-chat/blob/main/apps/server/src/modules/AssistantStore/index.ts

---

## 五、大陆可达性做法

这一问的结论最不平均：五家里只有两家做了事，且两家的思路完全不同。

### MoviePilot：代理前缀拼接，但对 API 无效

配置项是 `GITHUB_PROXY`，注释直接给出示例格式 `https://mirror.ghproxy.com/`，即 ghproxy 系前缀拼接，不是 jsDelivr，也不是自建 CDN。另有全局 `PROXY_HOST` 与 pip 镜像 `PIP_PROXY`。
https://github.com/jxxghp/MoviePilot/blob/main/app/runtime/config.py

拼接方式是纯前缀字符串拼接 `f"{standardize_base_url(GITHUB_PROXY)}{url}"`。降级顺序由唯一实现 `_build_github_request_strategies` 决定，同步与异步共用：

```python
strategies = []
if not is_api and get_runtime_setting('GITHUB_PROXY'):
    proxy_url = f"{UrlUtils.standardize_base_url(get_runtime_setting('GITHUB_PROXY'))}{url}"
    strategies.append(("镜像站", proxy_url, {...}))
if get_runtime_setting('PROXY_HOST'):
    strategies.append(("代理", url, {..., "proxies": get_runtime_setting('PROXY')}))
else:
    strategies.append(("直连", url, {...}))
```
https://github.com/jxxghp/MoviePilot/blob/main/app/adapters/external/plugin/client.py

有两点必须记清楚，否则容易高估这套方案：

1. **这不是「镜像失败回退直连」的完整轮询。** 镜像之后只保留**一个**出口：配了 `PROXY_HOST` 就用代理，否则直连。源码 docstring 明写「可选镜像站后只使用一个出口；显式配置代理时不再追加无效直连」。
2. **`is_api=True` 的请求不走镜像站。** 也就是说 GitHub Contents API 与 Releases API 这两条**插件实际下载的路径**无法用 ghproxy 加速，只能靠 `PROXY_HOST` 或直连。只有 raw 索引能吃到镜像。

`GITHUB_PROXY` 是单值字符串，**不支持镜像列表轮询**。同源机制也用在别处：容器更新脚本用同一前缀下载主程序与前端，并做代理连通性预检；后端还提供 `github_proxy_web` 与 `github_proxy_raw` 两个网络自检项。图标另有一层处理，前端对 `http` 开头的插件图标统一走后端图片代理，不直连 raw.githubusercontent。
https://github.com/jxxghp/MoviePilot-Frontend/blob/v3/src/components/cards/PluginCard.vue

### LobeChat：把索引发成 npm 包，默认就指向中国镜像

默认索引地址是 `https://registry.npmmirror.com/@lobehub/agents-index/v1/files/public`。npmmirror 由阿里巴巴运营，在大陆直连可达；而 `chat-agents.lobehub.com` 由 Vercel 与 Cloudflare 承载。两者内容一致（实测同一份 `index.zh-CN.json`）。

这条链路的可取之处是**免运营**：release workflow 跑 semantic-release 把 `public/` 作为 npm 包发布，npmmirror 自动同步，镜像地址立即可取。lobehub 因此不需要单独运营一个中国 CDN。同样的手法在该组织全线复用，文档里的 logo 与 emoji 资源也走 npmmirror。

需要如实标注的边界：

- 源码与文档中**没有任何**关于「镜像」「代理」「备用 URL」「fallback 域名」的说明或实现。
- 代码里**没有多 URL 容错**：索引 URL 只有一个值，抓不到就返回空数组，不会切换到自建域名。唯一的 fallback 是**语言**回退（非 entryLocale 取不到则退默认语言），不是域名回退。
- 官方从未在文档里写明「因为大陆访问」这个动机。「默认值指向中国镜像」与「全线复用同一手法」是可证的客观事实，动机属推断，**未验证**。

### Claude Code：没有镜像，但有完整的离线与气隙方案

官方文档**未提及**任何镜像站、代理配置或中国大陆网络说明，**未验证**。

但离线方向有明确方案，思路对「网络不可达」这个更一般的问题同样有效：

- `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1`：`git pull` 失败时不再重新 clone，继续用现有缓存。文档给的理由是「In offline or airgapped environments, re-cloning fails the same way」。
- **Seed 目录**：构建期用 `CLAUDE_CODE_PLUGIN_CACHE_DIR` 预置市场与插件，运行期用 `CLAUDE_CODE_PLUGIN_SEED_DIR` 指向它。seed 只读、自动更新禁用、移除与更新命令直接失败，多 seed 可分层。「For fully offline deployments where the repository will never be reachable, use `CLAUDE_CODE_PLUGIN_SEED_DIR` to pre-populate the plugins directory at build time instead.」

https://code.claude.com/docs/en/plugin-marketplaces#pre-populate-plugins-for-containers

企业内网自托管也支持：`hostPattern` 白名单可写内部 git 服务器正则，`extraKnownMarketplaces` 的 `git` 源支持自建 GitLab 或 Bitbucket，`url` 源加 `headers` 支持鉴权的内部制品库。

### Obsidian 与 HACS：官方完全未涉及

Obsidian：对开发者文档源仓库全量检索，镜像、代理、加速域名、中国大陆可达性均无任何命中，**未验证**。抓取链路事实上依赖 `github.com`、`api.github.com`、`objects.githubusercontent.com` 与 `community.obsidian.md`。

HACS：对 `hacs/integration` 全仓检索 `proxy`、`mirror`、`ghproxy`、`jsdelivr`，仅命中 `tests/` 下的测试夹具，那是单测的离线打桩机制，与运行时网络无关。CDN 域名在 `data_client.py` 中**硬编码**，下载 URL 在 `utils/url.py` 中硬编码 `github.com`，均无配置项覆盖。官方文档中没有任何镜像或代理页面。结论是**官方未提供任何镜像或代理能力**；社区常见的替换脚本均为第三方非官方方案，本次未在一手来源中发现，**未验证**。

---

## 六、更新检测

### Claude Code：版本即缓存 key，且版本可回退推导

原文：「Claude Code uses the plugin's version as the cache key that determines whether an update is available. When you run `/plugin update` or auto-update fires, Claude Code computes the current version and skips the update if it matches what's already installed.」
https://code.claude.com/docs/en/plugins-reference#version-management

因为版本来自第二节那条回退链，作者可以按需要选三种策略：

| 策略 | 做法 | 更新行为 |
| --- | --- | --- |
| 显式版本 | `plugin.json` 写 `version` | 只有 bump 才更新；不 bump 光推 commit 无效，会报已是最新 |
| commit SHA 版本 | 两处都省略 `version` | 上游 commit 变即更新 |
| 摘要版本 | `archive` 源且省略 `version` | 有 `sha256` pin 则改 pin 时更新，无 pin 则 zip 字节变即更新 |

自动更新是**每个市场独立开关**，默认值有讲究：官方市场默认开，**第三方与本地开发市场默认关**。触发时机是会话启动后延迟随机最多 10 分钟在后台刷新，当前会话仍用启动时加载的版本，更新后提示跑 `/reload-plugins`。管理员可在配置里对某个市场设 `autoUpdate: true`。带 `headersHelper` 的条目自动更新会跳过。
https://code.claude.com/docs/en/discover-plugins#configure-auto-updates

锁定版本是双层的：市场端可在 source 上同时写 `ref` 与 `sha`，用户端可在添加市场时用 `@ref` 钉住市场仓库本身。插件依赖支持 semver 范围。

### MoviePilot：自定义的数字段比较

比对对象是已安装插件类的 `plugin_version` 与在线索引条目的 `version`；`history` **不参与**判定，只作展示。
https://github.com/jxxghp/MoviePilot/blob/main/app/runtime/extensions/plugin/metadata.py

比较算法既不是字符串比较，也不是标准 semver，而是自定义的数字段序列比较：去掉前导 `v`，按 `.` 或 `-` 切分，纯数字段转整数，非数字段映射为负权重（`stable=-1, rc=-2, beta=-3, alpha=-4`，未知 `-5`），短的一侧补零后逐段比较。
https://github.com/jxxghp/MoviePilot/blob/main/app/foundation/version.py

同一函数也用于多源合并时取版本最高者。另有一层门禁：条目若声明 `system_version`（pip 约束语法），安装与更新检测都会校验当前主程序版本是否落在范围内，不满足则标记为不兼容并给出提示。跨代方面，V3 宿主会同时拉三代索引，条目可用 `"v3": false` 显式排除回退。

UI 上，`has_update` 布尔字段下发到前端：卡片右上角显示角标，下拉菜单出现「更新」项，若更新来源不是已绑定仓库则文案变为「查看更新来源」；市场列表还把 `has_update` 作为排序权重前置。

### Obsidian：比远端 manifest，加一层 minAppVersion 回退

客户端拉取插件仓**默认分支根目录**的 `manifest.json`，以其中的 `version` 作为最新版本，与本地已安装的比较。更新不需要重新投稿：「You only need to submit the initial version of your plugin. After your plugin has been published, users can download new releases from GitHub directly from within Obsidian.」
https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin

`minAppVersion` 参与的是**兼容性回退**而非版本比较：若远端 manifest 的 `minAppVersion` 高于用户 app 版本，Obsidian 转而读插件仓根目录的 `versions.json`（插件版本到 `minAppVersion` 的映射），回退到最近的兼容版本。
https://docs.obsidian.md/Reference/Versions

自动更新开关：开发者文档未描述客户端是否存在该设置项，**未验证**。但有一条相关政策很清楚——插件**不得自我更新**：「Plugins and themes must not: … Install or update themselves or their dependencies.」目录侧的「发现新 release」是周期性轮询，可在目录页手动触发重查。

### HACS：有 Release 比 tag，无 Release 比 commit sha

判定顺序写在 `pending_update` 属性里：若用户显式选了 tag 且该 tag 等于默认分支，则比对 **commit sha**；否则若该仓「用 release」，则用 AwesomeVersion 做**语义化版本比较**；兜底是字符串不相等即视为有更新。
https://github.com/hacs/integration/blob/main/custom_components/hacs/repositories/base.py

```python
@property
def pending_update(self) -> bool:
    if self.data.installed:
        if self.data.selected_tag is not None:
            if self.data.selected_tag == self.data.default_branch:
                return self.data.installed_commit != self.data.last_commit
        if self.display_version_or_commit == "version":
            if (result := version_left_higher_then_right(
                    self.display_available_version,
                    self.display_installed_version)) is not None:
                return result
        if self.display_installed_version != self.display_available_version:
            return True
    return False
```

远端值来自 CDN 的 `last_version` 与 `last_commit`，本地值来自已安装记录。`hide_default_branch` 只是告诉 HACS **不要把默认分支作为可下载选项提供给用户**，是展示层开关，后端不据此改变比对算法。

UI 提示的载体是 Home Assistant 的 **update 实体**：每个已下载仓库生成一个 `HacsRepositoryUpdateEntity`，支持 `INSTALL`、`SPECIFIC_VERSION`、`PROGRESS`、`RELEASE_NOTES`，所以可以用 `update.install` 服务指定版本（官方推荐用它替代即将移除的版本选择器），release notes 会把已装版本到最新版本之间的所有 release body 拼接起来。更新后对 integration 追加「You need to restart Home Assistant manually after updating.」，对 plugin 则是清前端缓存的提示。
https://github.com/hacs/integration/blob/main/custom_components/hacs/update.py

下载本身是「删除目标目录、重建、下载全部预期文件」，但升级前会备份本地目录、失败自动还原，`persistent_directory` 声明的路径在升级前后单独保留。

### LobeChat：legacy 索引根本不做更新检测

事实链有五条：

1. 索引条目里**没有可比对的版本字段**。`schemaVersion` 恒为 1，`createdAt` 只记创建日，**没有 `updatedAt`**——代码注释直说 `// Legacy source doesn't have updatedAt, fallback to createdAt`。
2. `AssistantStore` 与 `PluginStore` 只有三个读操作，**没有任何 diff、compare 或 hasUpdate 方法**。
3. 全仓检索 `hasNewVersion` 一类标识，只命中桌面端自更新与应用自身版本提示，与市场无关。
4. 用户从市场「添加」agent 的语义是**一次性复制**成本地会话配置，此后与上游脱钩；插件安装保存的是 manifest URL，每次按 URL 现取，同样不做版本比对。
5. 客户端每次进入发现页都拉最新索引（受服务端 revalidate 约束），所以**用户看到的永远是最新，但已添加的那份永远是旧的**，且系统不会提示。

https://github.com/lobehub/lobe-chat/blob/main/apps/server/src/services/discover/index.ts

值得记的是该项目的新市场**补上了这一块**：新接口返回 `version` 与版本表（`versions[]`、`currentVersion`、`archived` 与 `deprecated` 状态），并改为 fork 模型（记 `sourceIdentifier`、`forkedFromAgentId`、`forkCount`）。MCP 与 Skill 侧有真正的 semver 比较。这说明「先不做更新检测」在这类市场里是一个会被回头补的决定。

---

## 七、第三方源的信任提示与官方源的投稿审核

### Claude Code

信任提示有两处原文。安装页：

> "Make sure you trust a plugin before installing it. Anthropic doesn't control what MCP servers, files, or other software are included in plugins and can't verify that they work as intended. Check each plugin's homepage for more information."

Security 章节：

> "Plugins and marketplaces are highly trusted components that can execute arbitrary code on your machine with your user privileges. Only install plugins and add marketplaces from sources you trust."

https://code.claude.com/docs/en/discover-plugins#security

移除市场时另有一条提示：「Removing a marketplace will uninstall any plugins you installed from it.」

信任门禁的设计值得单列：项目配置文件里声明的市场**只在用户接受该文件夹的信任对话框之后才生效**，非交互会话不算接受，父目录的信任也不算。`command` 源必须由用户逐条看到命令原文并接受。
https://code.claude.com/docs/en/plugin-marketplaces#how-users-accept-the-command

企业策略控制是五家里最完整的：`strictKnownMarketplaces` 白名单（`[]` 表示全禁，支持 owner 通配与 `hostPattern`）、`blockedMarketplaces` 黑名单、`pluginSuggestionMarketplaces`（限定哪些市场可出现推荐）、`disableCommandPluginSources`、`allowManagedHooksOnly`。官方提醒白名单的精确匹配对尾斜杠、`.git` 后缀、协议前缀敏感，建议用 `hostPattern`。

投稿是**双市场结构**：`claude-plugins-official` 由官方策展、无申请流程；第三方投稿落在 `claude-community`（仓库 `anthropics/claude-plugins-community`），用户需手动添加该市场。投稿前本地跑 `claude plugin validate ./your-plugin`，「The review pipeline runs the same check on every submission, along with automated safety screening」。通过后**钉在具体 commit SHA**，CI 随作者推新 commit 自动 bump pin，公开目录**每晚同步**。
https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace

校验器的实际检查项：schema 错误、重复插件名、source 路径穿越；对本地路径条目还会校验其 `plugin.json` 并在版本不一致时告警。

下架用 `renames` 把插件名映射到 `null`：「Old name maps to `null` → removed, key dropped from settings」，且支持重命名链，校验器会拒绝成环或不终结于 `null` 的链。
https://code.claude.com/docs/en/plugin-marketplaces#rename-or-remove-plugins

### MoviePilot

这家最值得借鉴的是**运行时的来源绑定模型**，而不是提示文案本身。每个已安装插件持有一条来源身份记录，把「可信更新来源」与「当前载荷来源」分开审计：

- 来源类型枚举 `unknown` / `official` / `third_party`，载荷另有 `local`。
- 规范来源键形如 `github:<owner>/<repo>`，官方键硬编码，且官方键与官方类型必须双向一致，否则抛错。
- 绑定依据枚举含 `legacy_unbound`、`local_only`、`official_default`、**`tofu`**、`explicit_install`、`explicit_source_change`。
- 硬约束：`official_default` 只能绑官方；**TOFU 只能绑定唯一第三方在线来源**；在线载荷来源必须与可信更新来源一致。
- 载荷带 `sha256:<64hex>` 内容收据。

https://github.com/jxxghp/MoviePilot/blob/main/app/application/plugin/identity.py

```python
if (self.binding_basis is PluginBindingBasis.OFFICIAL_DEFAULT
        and self.trusted_source_type is not TrustedPluginSourceType.OFFICIAL):
    raise ValueError("official_default 只能绑定官方来源")
if (self.binding_basis is PluginBindingBasis.TOFU
        and self.trusted_source_type is not TrustedPluginSourceType.THIRD_PARTY):
    raise ValueError("TOFU 只能绑定唯一第三方在线来源")
```

一个细节很有价值：TOFU 只有在候选快照「完整」时（所有预期市场与代际都读成功、且本地读取未失败）才允许自动绑定，避免网络抖动导致误绑。
https://github.com/jxxghp/MoviePilot/blob/main/app/application/plugin/source.py

UI 风险提示成套且落在安装这一步（前端 i18n）：「这是第三方仓库，后续更新将来自该仓库，请确认后继续。」「该插件来自第三方仓库，请确认后安装。」「检测到官方和第三方仓库，请选择安装来源。」「插件只会从已绑定仓库更新。」另有三套二次确认对话框（确认第三方安装、确认来源绑定、确认来源变更）与「需确认仓库」角标。

但要注意落点：**添加市场源这个对话框本身没有任何风险提示文案**，整块只有格式、去重与同步相关文案。风险提示全部下沉到安装与绑定单个插件这一步。

另有一个 `level` 认证等级机制：索引的 `level` 映射为插件的 `auth_level`，与站点认证等级比较决定可见性；`level == 99` 是特殊档，需要环境变量里的私钥与索引条目里的公钥做密钥对校验才放行。
https://github.com/jxxghp/MoviePilot/blob/main/app/runtime/extensions/plugin/access.py

官方仓**没有 PR 模板**，但有 CI 门禁 `Plugin Gate`，PR 到 main 触发，包含：索引 `version` 与目录 `__init__.py` 中 AST 提取的 `plugin_version` 必须相等、目录必须存在、V3 条目额外校验 history 非空且首项等于当前版本且按语义版本降序；新插件必须带测试；checkout 宿主仓跑测试；五平台矩阵验证依赖可安装。
https://github.com/jxxghp/MoviePilot-Plugins/blob/main/.github/workflows/plugin-gate.yml

下架：仓库与文档中无记载，索引也无 deprecated 字段，**未验证**。可观察到的机制是删除索引条目即从市场消失，因为展示完全由索引驱动。

### Obsidian

安装社区插件时的应用内安全警告与 Restricted mode 原文：开发者文档全站检索无命中，该文案位于应用内与用户帮助站，不在本次一手来源范围内，**未验证**，不提供推断文本。

现行投稿流程是网页表单加自动扫描：准备仓库根目录文件；打 tag 等于 manifest `version` 的 Release 并上传三件套；登录目录站、**绑定 GitHub 账号**以验证仓库归属、填仓库 URL 并勾选同意开发者政策；自动审核出结果后修正、发布新 release 重扫。已**不再**通过提 PR 改索引。
https://docs.obsidian.md/Community+directory/Set+up+and+claim

自动审核的维度写得很清楚：

> "After each release, the directory scans your `manifest.json`, GitHub release assets, and source code, and verifies that the build matches what's committed. Results are grouped into sections covering the manifest, the release assets, the source code, and build verification, and each result is rated as an error, a warning, a recommendation, or a pass."

Warning 不阻塞发布，Error 阻塞「可从应用内安装」。支持用 Review branch 对任意分支或 tag 预扫，支持私有源码仓（公开仓放构建产物，装 GitHub App 读私有源码做一致性校验）。人工 review 周期：文档未给任何时长承诺，**未验证**。

历史上（PR 时代）的 CI 校验项对设计很有参考价值，此处保留：只允许改索引文件；PR 正文须含模板全部勾选句；新条目必须在数组末尾且提交者是 repo owner 或该组织公开成员；条目键必须恰为五个；`repo` 必须两段；`id` 不得含 `obsidian`、不得以 `plugin` 结尾、只允许特定字符集；`name` 与 `description` 不得含 "Obsidian"；description 不超过 250 字符；不得与现有条目或**已移除条目**重复；拉远端 manifest 校验必填键与允许键；按 manifest version 查 Release 并校验资产含 `main.js` 与 `manifest.json`；仓库必须有可识别 license。校验失败由机器人评论并打 `Validation failed` 标签，通过则改写 PR 标题、指派给审核机器人、打 `Ready for review`。
https://github.com/obsidianmd/obsidian-releases/blob/104ad1dcda1ff138bf1a1fbc26a4fd59512ce4dc/.github/workflows/validate-plugin-entry.yml

下架分三种：作者自助 **Archive**（「Archiving removes the entry from the directory and prevents new installations.」，可撤销）；官方移除（政策违规先联系作者给期限，恶意或作者不配合可立即移除）；移除留痕写进 `community-plugins-removed.json`，条目含 `reason`，且被移除的 `id` **不允许再次使用**。

还有一处工程细节值得单独记：镜像 workflow 每小时跑一次，下载后校验顶层是数组、必填字段是字符串、`repo` 符合正则、id 无重复，再做**留存率闸门**（新文件条目数不得低于旧文件的 95%）与**绝对下限**（插件索引不低于 1500 条），任一不过则失败、不覆盖。这是一份可直接照搬的「索引同步安全阀」。
https://github.com/obsidianmd/obsidian-releases/blob/master/.github/workflows/mirror-community-json.yml

### HACS

**添加自定义仓库的对话框上没有安全风险警告**，全部文案只有标题、URL 占位、类型、两条缺字段报错。文档侧的提示是兼容性而非安全性：「Not all repositories will work in HACS, since HACS still needs the repository to have a known structure.」
https://hacs.xyz/docs/faq/custom_repositories/

风险告知被**前置到整个 HACS 的安装配置流**：必须逐条勾选四项声明才能完成配置，未全勾则报错「You need to acknowledge all the statements before continuing」。

> - I know how to access Home Assistant logs
> - I know that there are no add-ons in HACS
> - I know that everything inside HACS including HACS itself is custom and untested by Home Assistant
> - I know that if I get issues with Home Assistant I should disable all my custom_components

投稿流程：仓库先能作为自定义仓库正常工作、公开托管在 GitHub；接入并通过 **HACS Action** 与 Hassfest；在 Action 跑通后新建一个正式 Release；向 `hacs/default` 对应文件按字母序加一行，PR 必须可编辑。
https://hacs.xyz/docs/publish/include/

CI 校验项（逐条在 `custom_components/hacs/validate/` 下有实现）：brands 目录含图标；`manifest.json` 必含指定字段且 URL 与版本合法；`hacs.json` 存在且至少含 `name`，`zip_release` 为真时必须配 `filename`；仓库不能是归档状态；至少有一个 release；提交者须为 owner 或主要贡献者；README 中须有图片（plugin 与 theme）；仓库须有 description、开启 issues、有 topics；须有合法 SPDX license；须有 information 文件。`hacs/default` 侧另有 `lint jq`（合法 JSON）与 `lint sorted`（排序正确）两项。
https://github.com/hacs/integration/tree/main/custom_components/hacs/validate

「不能是 fork」这条在 `validate/` 下没有对应规则文件，文档也未列出，**未验证**。

人工 review 的规则写得很硬：「All checks must pass unless otherwise agreed upon with the HACS team before the PR was opened」；未正确填模板、陈述不实、非 owner 提交则**直接关闭不另行通知**。官方承认积压严重，「new additions still take months to be reviewed and included」。合并后要等下一次 4 小时一轮的定时扫描才纳入。

下架是三级，且**客户端有明确处置**，这点五家里只有 HACS 做到：记录写在 `hacs/default` 的 `removed` 与 `critical` 并经 CDN 分发，`removal_type` 区分普通下架与安全事故。客户端处理分三种情形——未安装则直接从本地索引移除；已安装且非 critical 则创建一条 Home Assistant **Repair issue**（WARNING 级）并打日志「You have '%s' installed with HACS this repository has been removed from HACS, please consider removing it. Removal reason (%s)」；critical 则直接 `log.critical` 并推送标题为 "URGENT!" 的持久化通知。
https://github.com/hacs/integration/blob/main/custom_components/hacs/base.py

### LobeChat

风险提示只覆盖新市场与自定义 Skill 的安装协议，文案有 verified 与 unverified 二分：

> 'protocolInstall.custom.security.description': 'Unofficial Skill, may have security risks. Verify source before installing.'
> 'protocolInstall.marketplace.unverified.warning': 'This Skill is from a third-party source. Verify that you trust the source before installing.'

安装前展示来源、作者、主页、版本与完整配置（command、args、env、headers、url）。
https://github.com/lobehub/lobe-chat/blob/main/packages/locales/src/default/plugin.ts

但对 legacy 索引里的插件是否有等价提示，**未验证**；agents 侧（纯提示词、无代码执行）**没有**任何信任提示。

投稿有两条路，第一条是这次调研里最有意思的自动化：**Issue 表单驱动的自动开 PR**。issue 模板必填 `systemRole`、`identifier`、`avatar`、`title`、`description`、`tags`、`locale`，自动打标签；workflow 监听 `issues: [labeled]`，标签命中即解析 issue body、校验、写 `src/<id>.json`、推 `agent/<id>` 分支并开 PR。状态是三标签机：触发、自动检查通过、自动检查失败（失败时机器人评论具体错误，提示修好后重新打标签重跑）。
https://github.com/lobehub/lobe-chat-agents/blob/main/scripts/commands/auto-submit.ts

第二条是常规 fork 加 PR。插件仓只有第二条。

校验项：**JSON Schema 校验用 zod 写、再导出成 JSON Schema 发布**（`schema/lobeAgentSchema_v1.json`，文件名带 schemaVersion）；identifier 重复直接退出；identifier 必须是英文且强制 kebab-case；同名文件已存在则自动拒绝并评论；examples 结构自动修复；`tokenUsage` 自动计算；中文提示词过 pangu 处理；另有译文完整性校验。人工 review 是硬门槛：「Not all agents will be accepted, we will review the agent and make an assessment.」

下架：提 issue 或 PR 人工删源文件，下次构建自然从索引消失。插件仓另有一条运营规则：「If plugin is no longer functional and or not maintained, we might redirect it to a fork or remove it form the index.」

还有一处**部署侧的白黑名单**值得记：服务端读边缘配置的 `whitelist` / `blacklist` 对索引按 `identifier` 过滤，白名单优先。即不改上游仓库也能在自己的部署里屏蔽条目。
https://github.com/lobehub/lobe-chat/blob/main/apps/server/src/modules/AssistantStore/index.ts

---

## 八、横向对照表

| 维度 | Claude Code | MoviePilot | Obsidian | HACS | LobeChat |
| --- | --- | --- | --- | --- | --- |
| 索引文件 | `.claude-plugin/marketplace.json` | `package.v3.json`（根目录，三代并存） | `community-plugins.json`（已成上游镜像） | `hacs/default/<category>` + 各仓 `hacs.json` + CDN 聚合 JSON | `index.json`（CI 产物，不进 git，发成 npm 包） |
| 索引条目形状 | 数组，`name` + 七类 `source` | 对象，key 即插件 ID | 数组，每条恰好五字段 | 字符串数组（`owner/repo`） | 数组，`identifier` + `meta` |
| 条目如何指向内容 | `source` 显式声明（相对路径 / github / 任意 git / 子目录 / npm / zip / 命令） | 命名约定 `plugins.v3/<id小写>/` | `repo` 字段，内容取自该仓 Release | `owner/repo`，结构由 `hacs.json` 描述 | agents 靠 `identifier` 拼同目录文件；plugins 带完整 `manifest` URL |
| 索引里有版本吗 | 可选，多数条目不写 | 有，且与代码、history 三处强制一致 | **没有** | 没有（CDN 聚合层有 `last_version`） | 只有 `schemaVersion`，非内容版本 |
| 版本真实来源 | 回退链：plugin.json → 索引 → commit SHA → zip 摘要 | 索引 `version` = 类属性 `plugin_version` | 各仓 `manifest.json` | 有 Release 用 tag，无 Release 用 commit 前七位 | 无 |
| 多语言描述 | 未验证 | 不支持 | 不支持 | 不支持 | **支持**，每语言一份索引与详情，CI 用 LLM 生成 |
| 源地址书写 | `owner/repo`、任意 git URL、本地路径、直链 JSON | 逗号分隔完整 GitHub URL | 不适用（无第三方源） | 完整 URL 或 `owner/repo`，正则归一，另选 category | 完整 URL（环境变量） |
| 钉版本 | `@ref` / `#ref`（源）+ `ref` / `sha`（条目） | 不支持 | 不适用 | 添加时不支持，下载时可选 release | 不支持 |
| 非 GitHub 托管 | **支持** | 不支持（hostname 硬白名单） | 不适用 | **明确不支持** | 支持（任意 URL 前缀） |
| 多源与优先级 | 多市场并存，按市场名区分 | 多源，按配置下标排序，**版本高者胜** | 单一官方源 | 官方索引 + 自定义仓库并存 | **只能配一个 URL** |
| 抓取通道 | git clone / sparse clone / HTTPS zip | raw（索引）+ Contents API（文件）+ Releases API | 索引 + 各仓 manifest + Release 附件 | CDN 聚合（默认仓）+ GitHub API（自定义仓）+ 直连下载 | 服务端拉 npmmirror |
| 缓存 | `~/.claude/plugins/cache`，按版本分目录 | 进程内 LRU，TTL 1800 秒，可 cache-buster | 未验证 | ETag 条件请求 + HA storage + 6/48 小时定时 | Next.js 服务端缓存，列表 1 小时、详情 12 小时 |
| 限流应对 | 未验证（走 clone 非 API） | 两级 token（全局 + 按仓库），403 专门文案 | 未验证 | **强制 Device Flow 登录**，配额预留 1000 | 不适用（走 CDN） |
| 大陆可达性 | 无镜像；有离线 seed 目录与气隙开关 | `GITHUB_PROXY` 前缀拼接；**API 请求不走镜像**；单值无轮询 | 未验证 | 未验证（域名硬编码，无配置项） | **默认地址即 npmmirror**，随 npm 发布免运营 |
| 更新检测 | 版本即缓存 key，三种策略可选 | 自定义数字段比较，`system_version` 门禁 | 比远端 manifest `version`，`minAppVersion` 触发回退 | 比 tag 或 commit sha，映射为 HA update 实体 | **不做** |
| 自动更新 | 每市场独立开关，第三方默认关，延迟最多 10 分钟 | 未验证 | 未验证（但禁止插件自我更新） | 通过 update 实体 | 不适用 |
| 第三方源信任提示落点 | 添加源与安装两处，均有原文警告 | **安装并绑定单个插件**时（添加源处无提示） | 不适用 | **整体安装配置流强制勾选四条**（添加源处无提示） | 仅新市场与自定义 Skill 的安装协议 |
| 来源绑定 | 市场名 + 条目 `sha` | **TOFU 首次信任绑定**，载荷带 sha256 收据 | 无 | 无 | 无 |
| 企业与部署侧管控 | 白名单、黑名单、推荐源限制、命令源禁用等 | 无 | 无 | 无 | 边缘配置白黑名单按 identifier 过滤 |
| 投稿方式 | 提交入口 + CI 校验 + 人工，通过后钉 commit SHA | 向官方仓提 PR，过 `Plugin Gate` | **网页表单 + 自动扫描器**（PR 时代已终结） | 向 `hacs/default` 加一行并过 HACS Action | **Issue 表单自动开 PR** 或常规 PR |
| 自动校验强度 | `claude plugin validate`，同一套检查在投稿流水线复用 | 版本三处一致、测试、五平台依赖安装 | manifest / release 资产 / 源码 / **构建产物一致性** | 11 项规则 + JSON 合法性与排序 | zod schema + 唯一性 + 命名规范 + 译文完整性 |
| 下架方式 | `renames` 映射到 `null`，支持重命名链 | 删索引条目（流程未验证） | Archive 自助 + 官方移除，**留痕文件且 id 不可复用** | 三级记录，**客户端建 Repair issue 或紧急通知** | 删源文件；插件可重定向到 fork |

---

## 九、对 ArcReel 的可借鉴点

本节只陈述从上述一手事实中可提取的做法与可选项，不对 ArcReel 的设计作出取舍。取舍属于决策票与 Spec。

### 关于索引文件

- **「索引里放不放版本」有两种成熟答案。** 放（MoviePilot、Claude Code 可选）便于客户端只读一份文件就完成更新判定；不放（Obsidian）则索引只承担搜索与指路，版本由条目指向的内容文件自己声明，索引因此极少变动。ArcReel 首期条目的载荷是定义文件本身，两种都成立。
- **条目指向内容的方式，约定与显式各有代价。** MoviePilot 用命名约定（目录名等于 ID 小写），省字段但要靠 CI 校验目录与索引一致；Claude Code 用显式 `source` 字段，字段多但能一份索引聚合分散在多个仓库的条目。若官方市场源同时是模板仓、希望投稿者把定义文件放进自己的仓库，显式指针是唯一可行的一种。
- **索引本身可以是构建产物。** LobeChat 的 `index.json` 不进 git，由 CI 从源文件目录生成。好处是投稿者只改一个自己的文件、不碰索引，天然没有索引合并冲突；代价是多一层构建，且索引必须有地方托管。
- **多语言描述只有一家做了，做法是每语言一份索引文件。** LobeChat 用 entryLocale 无后缀、其余带 `.<locale>` 后缀的命名，源文件分成「正本 + 译文片段」两层，构建期合并，译文由 CI 调 LLM 生成并由机器人提交。ArcReel 面向用户文本需要全语言 key，若市场条目的标题与描述要进 UI，这是唯一有一手实现可参照的模式。

### 关于市场源地址

- **归一化函数是安全边界，不只是便利。** MoviePilot 与 HACS 都把用户输入的任意形态正则归一成规范键，MoviePilot 还硬性拒绝非 `github.com` 的 hostname。规范键同时用于去重、排序和来源身份记录。
- **多源冲突需要一条成文规则。** MoviePilot 的规则是完整的：排序键取配置下标，先按「ID + 版本」去重，再按 ID 归并、版本高者胜，同版本则配置靠前者胜。地图里市场源已定为有序列表并可拖拽排序，这条规则与之直接对应。
- **「源清单」本身可以是可订阅的上游文件。** MoviePilot 提供一个接口从官方 Wiki 抓取被标记块包裹的第三方仓库清单，合并进本地配置，并用硬编码白名单限制该清单的来源地址。这是「官方随版预置」之外的另一种分发第三方源的方式。
- **钉版本的粒度有两层。** Claude Code 把「钉住市场仓库」（源上的 `@ref`）与「钉住单个条目」（条目 `source` 里的 `ref` 加 `sha`）分开，且市场层只给 `ref` 不给 `sha`。

### 关于抓取路径与缓存

- **读索引与取内容可以走不同通道。** MoviePilot 用 raw 读索引、用 Contents API 取文件，两者的限流与代理适用性完全不同。这个差异正是它镜像方案的缺口所在。
- **预聚合是绕开限流最彻底的做法。** HACS 每 4 小时用 CI 把所有被收录仓的元数据聚合成一份 JSON 发到 CDN，客户端读列表完全不打 GitHub API；只有自定义仓库才回落到 API。代价是需要运营一个生成流水线与一个分发点，且自定义源享受不到。
- **条件请求与 TTL 都值得要。** HACS 逐 endpoint 记 ETag 并带 `If-None-Match`，304 即跳过；MoviePilot 用 30 分钟进程内 TTL，并在强制刷新时追加时间戳参数**绕过中间缓存**。地图已定「一键刷新」，这个 cache-buster 细节与之配套。
- **索引解析要设上限。** MoviePilot 对索引设了大小、条目数、单条 history 长度、JSON 嵌套深度与超时五个上限。索引来自用户可添加的第三方源时，这属于必需而非优化。
- **同步索引要设留存率闸门。** Obsidian 的镜像 workflow 在覆盖前校验 JSON 结构，并要求新文件条目数不低于旧文件的 95%、且不低于绝对下限，否则失败不覆盖。任何「从上游拉一份索引覆盖本地」的流程都可以照搬。

### 关于大陆可达性

这一问的一手结论可以直接回答地图「Not yet specified」里那条待定项：

- **业界只有两种已落地的做法。** 一是**代理前缀拼接**（MoviePilot 的 `GITHUB_PROXY`，ghproxy 形态），二是**把索引发布到本身在大陆可达的分发渠道**（LobeChat 把索引发成 npm 包、默认地址指向 npmmirror）。
- **前缀拼接方案有一个必须知道的缺口**：ghproxy 类前缀对 raw 有效，对 `api.github.com` 无效。MoviePilot 的源码显式地在 `is_api=True` 时跳过镜像，因此它真正被加速的只有索引，插件文件下载仍需另配代理或直连。如果抓取路径里含 GitHub API 调用，镜像开关不能覆盖全链路。
- **降级链不等于轮询。** MoviePilot 的策略链是「镜像 → 单一出口（代理或直连）」，不是多镜像逐个重试，且 `GITHUB_PROXY` 是单值。若需要多镜像轮询，没有一手实现可参照。
- **另外两种有价值但方向不同的做法**：Claude Code 的 seed 目录（构建期预置、运行期只读，面向完全不可达的环境）与 HACS 的预聚合 CDN（虽非为大陆设计，但「官方托管一份聚合索引」本身就把索引读取从 GitHub 上摘了出来）。
- **Obsidian 与 HACS 官方都没做**，两家的下载链路完全硬编码 GitHub 域名，无配置项可覆盖。这说明「不做镜像」也是一个被广泛采用的选择，代价由用户自己承担。

### 关于更新检测

- **版本比较算法要自己定义清楚。** 三家给出三种：AwesomeVersion 语义比较（HACS）、自定义数字段加预发布权重（MoviePilot，`stable > rc > beta > alpha`）、字符串相等即缓存 key（Claude Code）。字符串相等这一种最简单，且能自然容纳「没有版本号就用 commit SHA 或内容哈希」。
- **「没有版本」有现成的兜底。** Claude Code 的回退链与 HACS 的「无 Release 用 commit 前七位 sha」都表明：条目不写版本时，用内容标识（commit、摘要）当版本是可行的。
- **不做更新检测是可以的，但会被回头补。** LobeChat 的 legacy 索引把安装定义为一次性复制、与上游脱钩，因此完全没有更新概念；其新市场随后补上了版本表与 fork 血统。地图已定「复制为我的」副本不跟随上游，这与 legacy 的语义一致，而「已安装端点被本地修改后的更新语义」正是那家后来需要补的部分。
- **更新提示可以挂在平台已有的实体上。** HACS 把每个已下载仓库映射成 Home Assistant 的 update 实体，从而免费获得版本展示、指定版本安装、release notes 与通知。

### 关于信任提示与投稿审核

- **风险提示的落点有三种，且互斥性不强。** 加源时提示（Claude Code）、安装单个条目时提示（MoviePilot、Claude Code）、在功能总开关处一次性强制勾选免责（HACS）。地图已定「添加第三方市场源时提示一次」，MoviePilot 的实践提示：真正承载风险的动作是安装，它把成套文案全部放在那一步，而加源对话框反而没有提示。
- **来源绑定（TOFU）是一个完整可抄的模型。** 规范来源键、来源类型枚举、绑定依据枚举、「官方默认只能绑官方 / TOFU 只能绑唯一第三方」的硬约束、载荷 sha256 收据、以及「快照不完整时不自动绑定」的保护。地图已定要记录安装来源，这套模型给出了记录之外还需要哪些约束。
- **CI 校验项可以直接列成清单。** 五家的共同项是：索引文件是合法 JSON、条目字段集合受限、ID 唯一且命名受限、ID 不得与已移除条目重复、指向的内容实际存在。各家特色项包括版本三处一致（MoviePilot）、构建产物与源码一致（Obsidian）、仓库须有 description 与 license（HACS）、schema 由 zod 导出（LobeChat）。
- **投稿入口可以不是「手改索引文件」。** LobeChat 用 Issue 表单加 workflow 自动解析、写文件、开 PR，并用三个标签表示触发、通过、失败；Obsidian 已整体迁移到网页表单加自动扫描。两者都把「投稿者需要手工编辑索引」这一步去掉了，从而消除索引的并发冲突。
- **下架需要一个比「删条目」更完整的答案。** 这正对应地图「Not yet specified」里的下架提醒项。三种一手做法：Claude Code 在索引里保留 `renames` 映射到 `null`（下架与改名统一建模，且支持重命名链）；Obsidian 保留 `community-plugins-removed.json` 留痕并禁止 id 复用，另有版本级的 deprecation 文件；HACS 把下架记录分普通与安全事故两级分发，**客户端对已安装者主动建一条 Repair issue，对安全事故直接推紧急通知**。
- **部署侧过滤是投稿审核之外的一层。** LobeChat 的服务端按 identifier 白黑名单过滤索引，不需要改上游仓库。

---

## 十、未验证清单

以下各项在一手来源中查不到，已在正文标注，此处汇总：

- **Claude Code**：索引是否支持多语言或 i18n 描述字段；GitHub 未认证限流的处理；镜像站或大陆可达性说明；市场仓库本身的完整性如何保证（市场源只支持 `ref` 不支持 `sha`）。
- **MoviePilot**：插件下架或废弃的官方流程（索引无 deprecated 字段）；第三方仓库进入官方 Wiki 源清单的准入审核流程；索引中出现的 `project_url`、`repo`、`color` 三个非文档化字段的用途。
- **Obsidian**：客户端读取索引的确切 URL；是否有 CDN；镜像或代理；应用内安全警告与 Restricted mode 的原文；客户端是否有自动更新开关；人工 review 周期；BRAT 的输入参数格式；`community-plugin-deprecation.json` 的客户端消费语义。
- **HACS**：HACS Action 是否检查「仓库不能是 fork」；官方镜像或代理能力（源码与文档中不存在相关开关，社区第三方方案未在一手来源中出现）；`hacs/default` 中 `blacklist` 与 `removed` 两个文件的确切职责划分。
- **LobeChat**：legacy 插件索引里的条目是否有等价的第三方风险提示；新市场域名的大陆可达性做法；`registry.lobehub.com` 是否存在（三个仓库中均无出现）；「默认指向 npmmirror 是为了大陆可达性」这一动机（事实可证，动机为推断）。
