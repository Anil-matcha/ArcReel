"""PROTOTYPE（issue #2460）——提示词模版引擎的最小可用形态，不进产品代码。

回答的问题：「整段模版 + 命名变体片段 + 仅真值条件」能否承载现有 builder 的措辞（允许
经裁定的措辞收敛，差异以 diff 呈现），以及 Jinja2 沙箱 + StrictUndefined + 白名单过滤器在
缺槽位 / 多余槽位 / 未知片段时何时、以什么信息报错。

对调用方只暴露三个动作：``render`` / ``list_templates`` / ``read_source``。

目录约定（``templates/``）：
- ``<category>/<entry>.md``：一个生成入口一个文件，YAML frontmatter 放元数据，正文是完整提示词。
- ``partials/shared/<name>.md``：跨模版共享的固定片段，模版内以 ``{{ partial("shared/name") }}`` 引用；
  不存在即报错。
- ``partials/shared/<family>/<axis_value>.md``：跨模版共享的命名变体片段，
  以 ``{{ variant("shared/family", axis_value) }}`` 引用；family 目录不存在即报错，目录存在但该轴值
  无文件即渲染为空串。
- ``partials/<template id>/<family>/<axis_value>.md``：单个模版私有的命名变体片段，目录名镜像模版 id
  （如 ``partials/text/drama_script_plan/task/novel.md``），引用方式同上。只被一个模版引用的固定措辞
  不做片段，直接写在模版正文里。

片段名就是相对 ``partials/`` 的路径，引擎不做隐式查找；``shared/`` 与模版 id 前缀只是目录约定，
让维护者一眼分清「动它会牵连别的入口」与「只属于这个入口」。

片段渲染结果统一去掉尾部换行，由引用处决定换行——与现有 builder 里常量不带尾换行的用法一致。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from jinja2 import StrictUndefined, TemplateAssertionError, TemplateSyntaxError, meta, pass_context
from jinja2.exceptions import UndefinedError
from jinja2.runtime import Context
from jinja2.sandbox import SandboxedEnvironment

#: 只暴露给模版的过滤器。``default`` 故意不在内：它会吞掉 StrictUndefined 的缺槽位报错。
WHITELISTED_FILTERS = frozenset({"join", "indent", "trim"})

#: 模版可调用的两个全局函数名（静态扫描时从「未声明变量」里剔除）。
_GLOBAL_NAMES = frozenset({"partial", "variant"})

_PARTIAL_CALL = re.compile(r"""\b(partial|variant)\(\s*"([^"]+)"\s*(?:,([^)]*))?\)""")
_KWARG_NAME = re.compile(r"\b(\w+)\s*=")
_FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


class TemplateError(Exception):
    """原型里所有 fail-loud 的基类，便于样例脚本统一捕获。"""


class DuplicateTemplateId(TemplateError): ...


class UndeclaredSlot(TemplateError): ...


class MissingSlot(TemplateError): ...


class ExtraSlot(TemplateError): ...


class UnknownPartial(TemplateError): ...


class UnknownTemplate(TemplateError): ...


class RenderFailure(TemplateError):
    """渲染期由 Jinja 抛出的错误（StrictUndefined / 沙箱）——包一层带上模版 id。"""


@dataclass
class TemplateMeta:
    id: str
    category: str
    title: str
    description: str
    applies_to: dict[str, list[str]]
    slots: dict[str, str]
    protected: bool
    path: Path
    output_schema: str | None = None  # "module:ClassName"，指向 response_schema 的 pydantic 模型；无结构化输出时为 None
    partials: list[str] = field(default_factory=list)  # 固定片段名与 "family/*"


class PromptTemplates:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.partials_dir = directory / "partials"
        self.env = SandboxedEnvironment(
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True,
            keep_trailing_newline=True,
            autoescape=False,
        )
        self.env.filters = {name: self.env.filters[name] for name in WHITELISTED_FILTERS}
        self.env.globals = {"partial": self._partial, "variant": self._variant}
        self._compiled_partials: dict[str, Any] = {}
        self._registry: dict[str, tuple[TemplateMeta, Any]] = {}
        self._load()

    # ------------------------------------------------------------------ 三个动作

    def render(self, template_id: str, **slots: Any) -> str:
        template_meta, template = self._get(template_id)
        declared = set(template_meta.slots)
        given = set(slots)
        if extra := sorted(given - declared):
            raise ExtraSlot(f"{template_id}: 传入了未声明的槽位 {extra}（已声明：{sorted(declared)}）")
        if missing := sorted(declared - given):
            raise MissingSlot(f"{template_id}: 缺少已声明的槽位 {missing}（可选槽位也须显式传 None）")
        try:
            return template.render(**slots)
        except UndefinedError as exc:
            raise RenderFailure(f"{template_id}: StrictUndefined 拦截 —— {exc}") from exc

    def render_unchecked(self, template_id: str, **slots: Any) -> str:
        """绕过槽位预检、直接交给 Jinja——只用于样例脚本对比 StrictUndefined 单独能拦住什么。"""
        _template_meta, template = self._get(template_id)
        return template.render(**slots)

    def list_templates(self) -> list[TemplateMeta]:
        return [template_meta for template_meta, _template in self._registry.values()]

    def read_source(self, template_id: str) -> tuple[str, dict[str, str]]:
        """返回 (正文源文, {片段名: 片段源文})；变体 family 展开为其目录下全部轴值文件。"""
        template_meta, _template = self._get(template_id)
        _frontmatter, body = _split_frontmatter(template_meta.path.read_text(encoding="utf-8"))
        partials: dict[str, str] = {}
        for name in template_meta.partials:
            if name.endswith("/*"):
                family_dir = self.partials_dir / name[:-2]
                for variant_path in sorted(family_dir.glob("*.md")):
                    partials[f"{name[:-2]}/{variant_path.stem}"] = _read_partial(variant_path)
            else:
                partials[name] = _read_partial(self.partials_dir / f"{name}.md")
        return body, partials

    # ------------------------------------------------------------------ 加载期校验

    def _get(self, template_id: str) -> tuple[TemplateMeta, Any]:
        try:
            return self._registry[template_id]
        except KeyError:
            raise UnknownTemplate(f"未知模版 id: {template_id!r}（已注册：{sorted(self._registry)}）") from None

    def _load(self) -> None:
        for path in sorted(self.directory.rglob("*.md")):
            if self.partials_dir in path.parents:
                continue
            raw = path.read_text(encoding="utf-8")
            frontmatter, body = _split_frontmatter(raw)
            template_meta = TemplateMeta(
                id=frontmatter["id"],
                category=frontmatter["category"],
                title=frontmatter["title"],
                description=frontmatter["description"],
                applies_to=frontmatter.get("applies_to") or {},
                slots=frontmatter.get("slots") or {},
                protected=bool(frontmatter.get("protected", False)),
                path=path,
                output_schema=frontmatter.get("output_schema"),
            )
            if template_meta.id in self._registry:
                other = self._registry[template_meta.id][0].path
                raise DuplicateTemplateId(f"模版 id {template_meta.id!r} 重复：{other} 与 {path}")
            referenced = self._collect_variables(template_meta.id, body, template_meta.partials, provided=set())
            if undeclared := sorted(referenced - set(template_meta.slots)):
                raise UndeclaredSlot(f"{template_meta.id}: 正文（含片段）引用了未声明的槽位 {undeclared}")
            try:
                template = self.env.from_string(body)
            except TemplateAssertionError as exc:
                raise TemplateError(f"{template_meta.id}: 编译失败 —— {exc}") from exc
            self._registry[template_meta.id] = (template_meta, template)

    def _collect_variables(
        self, template_id: str, source: str, partial_names: list[str], provided: set[str]
    ) -> set[str]:
        """静态收集正文及其引用片段里的自由变量；片段调用时以关键字传入的名字不算入。"""
        try:
            ast = self.env.parse(source)
            variables = (meta.find_undeclared_variables(ast) - _GLOBAL_NAMES) - provided
        except TemplateAssertionError as exc:
            raise TemplateError(f"{template_id}: 编译失败 —— {exc.message}") from exc
        except TemplateSyntaxError as exc:
            raise TemplateError(f"{template_id}: 语法错误 —— 第 {exc.lineno} 行：{exc.message}") from exc
        for kind, name, kwargs in _PARTIAL_CALL.findall(source):
            kwarg_names = set(_KWARG_NAME.findall(kwargs or ""))
            if kind == "partial":
                partial_path = self.partials_dir / f"{name}.md"
                if not partial_path.is_file():
                    raise UnknownPartial(f"{template_id}: 引用了不存在的片段 {name!r}（期望文件 {partial_path}）")
                if name not in partial_names:
                    partial_names.append(name)
                variables |= self._collect_variables(
                    template_id, _read_partial(partial_path), partial_names, kwarg_names
                )
            else:
                family_dir = self.partials_dir / name
                if not family_dir.is_dir() or not any(family_dir.glob("*.md")):
                    raise UnknownPartial(
                        f"{template_id}: 引用了不存在的变体片段族 {name!r}（期望目录 {family_dir}/ 下至少一个 <轴值>.md）"
                    )
                if f"{name}/*" not in partial_names:
                    partial_names.append(f"{name}/*")
                for variant_path in sorted(family_dir.glob("*.md")):
                    variables |= self._collect_variables(
                        template_id, _read_partial(variant_path), partial_names, kwarg_names
                    )
        return variables

    # ------------------------------------------------------------------ 渲染期片段解析

    def _render_partial(self, context: Context, path: Path, kwargs: dict[str, Any]) -> str:
        key = str(path)
        if key not in self._compiled_partials:
            self._compiled_partials[key] = self.env.from_string(_read_partial(path))
        return self._compiled_partials[key].render(**context.get_all(), **kwargs).rstrip("\n")

    @pass_context
    def _partial(self, context: Context, name: str, **kwargs: Any) -> str:
        path = self.partials_dir / f"{name}.md"
        if not path.is_file():
            raise UnknownPartial(f"渲染期引用了不存在的片段 {name!r}（期望文件 {path}）")
        return self._render_partial(context, path, kwargs)

    @pass_context
    def _variant(self, context: Context, family: str, axis_value: str, **kwargs: Any) -> str:
        family_dir = self.partials_dir / family
        if not family_dir.is_dir():
            raise UnknownPartial(f"渲染期引用了不存在的变体片段族 {family!r}（期望目录 {family_dir}/）")
        path = family_dir / f"{axis_value}.md"
        if not path.is_file():
            return ""
        return self._render_partial(context, path, kwargs)


def _split_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    match = _FRONTMATTER.match(raw)
    if match is None:
        raise TemplateError("模版文件缺少 YAML frontmatter（须以 '---' 开头并以 '---' 单独一行结束）")
    frontmatter = yaml.safe_load(match.group(1)) or {}
    return frontmatter, raw[match.end() :]


def _read_partial(path: Path) -> str:
    """片段源文只去掉尾部换行；行首空白（含刻意的前导空行）原样保留。"""
    return path.read_text(encoding="utf-8").rstrip("\n")
