// PROTOTYPE — 一次性代码，不进 main。
// 三个变体共用的小零件：徽标、图标占位、市场源状态片、确认页六个内容块。
// 只共用「块」，不共用布局：每个变体自己决定怎么排。
import { AlertTriangle, Check, Download, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { GHOST_BTN_CLS, hashHue, radioCardClass } from "@/components/ui/darkroom-tokens";

import {
  APP_VERSION,
  LOCAL_SAME_IDENTITY,
  STATUS_LABEL,
  mockDefinition,
  mockValidation,
  relativeTime,
  statusTone,
  type EntryView,
  type ProtoSource,
} from "./fixtures";

export const KICKER_CLS = "font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-4";
export const KICKER_ACCENT_CLS = "font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-2";

const BADGE_BASE = "inline-flex shrink-0 whitespace-nowrap items-center gap-1 rounded-[5px] border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]";

export function Badge({ tone = "muted", children, title }: { tone?: "accent" | "good" | "warn" | "danger" | "muted"; children: ReactNode; title?: string }) {
  const cls = {
    accent: "border-accent/35 bg-accent-dim text-accent-2",
    good: "border-good/35 bg-good/10 text-good",
    warn: "border-warn/40 bg-warn/10 text-warn",
    danger: "border-danger/40 bg-danger/10 text-danger",
    muted: "border-hairline-soft bg-bg-grad-a/55 text-text-3",
  }[tone];
  return <span title={title} className={`${BADGE_BASE} ${cls}`}>{children}</span>;
}

/** 两轴状态徽标：市场轴 state × 本地轴 modified。 */
export function InstallBadges({ state, modified }: { state: "current" | "update_available" | "unavailable"; modified: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {state === "current" && <Badge tone="good"><Check className="h-2.5 w-2.5" aria-hidden />已安装</Badge>}
      {state === "update_available" && <Badge tone="accent">可更新</Badge>}
      {state === "unavailable" && <Badge tone="warn">市场中不可用</Badge>}
      {modified && <Badge tone="muted">已修改</Badge>}
    </span>
  );
}

export function EntryIcon({ entry, size = 36 }: { entry: { slug: string; name: string; hasIcon: boolean }; size?: number }) {
  const hue = hashHue(entry.slug, 7);
  const initial = entry.name.trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[9px] border border-hairline-soft font-editorial text-text"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.48,
        background: entry.hasIcon
          ? `linear-gradient(145deg, oklch(0.62 0.14 ${hue}), oklch(0.36 0.10 ${(hue + 40) % 360}))`
          : "linear-gradient(180deg, oklch(0.22 0.011 265 / 0.7), oklch(0.17 0.010 265 / 0.7))",
        color: entry.hasIcon ? "oklch(0.98 0 0)" : "var(--color-text-4)",
      }}
    >
      {initial}
    </div>
  );
}

export function StatusDot({ source }: { source: ProtoSource }) {
  const tone = statusTone(source.status);
  const cls = { good: "bg-good", warn: "bg-warn", danger: "bg-danger", muted: "bg-text-4" }[tone];
  return source.refreshing
    ? <Loader2 className="h-3 w-3 animate-spin text-text-3" aria-label="刷新中" />
    : <span aria-label={STATUS_LABEL[source.status]} className={`inline-block h-2 w-2 rounded-full ${cls} ${source.isEnabled ? "" : "opacity-40"}`} />;
}

export function SourceStatusLine({ source, dense }: { source: ProtoSource; dense?: boolean }) {
  const failed = source.status !== "ok" && source.status !== "never_fetched";
  if (source.refreshing) return <span className="text-[11px] text-text-4">刷新中…</span>;
  return (
    <span className={`block truncate ${dense ? "text-[10.5px]" : "text-[11.5px]"} ${failed ? "text-warn" : "text-text-4"}`}>
      {failed
        ? `${STATUS_LABEL[source.status]} · ${source.lastError}${source.fetchedAt ? ` · 上次成功刷新于 ${relativeTime(source.fetchedAt)}` : ""}`
        : `刷新于 ${relativeTime(source.fetchedAt)}`}
    </span>
  );
}

export function SourceChip({ source }: { source: ProtoSource }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-hairline-soft bg-bg-grad-a/50 px-2 py-[1px] font-mono text-[10px] text-text-3">
      {source.kind === "official" && <span className="h-1.5 w-1.5 rounded-full bg-accent-2" aria-hidden />}
      <span className="truncate">{source.displayName}</span>
    </span>
  );
}

export function ThirdPartyNotice({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex items-start gap-2 rounded-[8px] border border-warn/35 bg-warn/8 ${compact ? "px-2.5 py-2" : "p-3"}`}>
      <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
      <p className="text-[12px] leading-[1.55] text-text-2">该来源未经 ArcReel 审核，安装前请确认来源可信。</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 确认页六个内容块（安装与更新共用）
// ---------------------------------------------------------------------------

export function BlockHeader({ entry, mode }: { entry: EntryView; mode: "install" | "update" }) {
  return (
    <div className="flex items-start gap-3">
      <EntryIcon entry={entry} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-editorial text-[20px] leading-tight text-text">{entry.name}</h3>
          {entry.installation && <InstallBadges state={entry.installation.state} modified={entry.installation.modified} />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-text-3">
          <span>{entry.author}</span>
          <span aria-hidden>·</span>
          {mode === "update" && entry.installation ? (
            <span>
              已安装 v{entry.installation.installedVersion} <span className="text-text-4">→</span> 市场 v{entry.version}
            </span>
          ) : (
            <span>v{entry.version}</span>
          )}
          <span aria-hidden>·</span>
          <SourceChip source={entry.source} />
          {entry.homepage && (
            <a href={entry.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent-2 hover:underline">
              主页 <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
        {entry.description && <p className="mt-2 text-[12.5px] leading-[1.6] text-text-2">{entry.description}</p>}
        {entry.source.kind === "custom" && <div className="mt-2.5"><ThirdPartyNotice compact /></div>}
      </div>
    </div>
  );
}

export function BlockValidation({ entry }: { entry: EntryView }) {
  const v = mockValidation(entry);
  if (v.errors.length === 0 && v.warnings.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-good">
        <Check className="h-3.5 w-3.5" aria-hidden />校验通过，索引与定义一致
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {v.errors.map((m) => (
        <li key={m} className="flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{m}（拒绝安装）</span>
        </li>
      ))}
      {v.warnings.map((m) => (
        <li key={m} className="flex items-start gap-1.5 text-[12px] text-warn">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  );
}

export function BlockTrust({ entry }: { entry: EntryView }) {
  const def = mockDefinition(entry) as { auth: unknown; submit: { url: string }; poll: { url: string } };
  return (
    <div className="space-y-2.5">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-text-4">凭证发往</dt>
        <dd className="truncate font-mono text-[11.5px] text-text">{def.submit.url}</dd>
        <dt className="text-text-4">轮询地址</dt>
        <dd className="truncate font-mono text-[11.5px] text-text">{def.poll.url}</dd>
      </dl>
      <div>
        <div className={`${KICKER_CLS} mb-1`}>auth · 原文</div>
        <pre className="overflow-x-auto rounded-[8px] border border-hairline-soft bg-bg-grad-a/60 p-3 font-mono text-[11px] leading-[1.6] text-text-2">
          {JSON.stringify(def.auth, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function BlockHints({ entry }: { entry: EntryView }) {
  const def = mockDefinition(entry) as { meta: { hints: { base_url: string; suggested_models: { id: string; label: string }[] } } };
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
      <dt className="text-text-4">建议 Base URL</dt>
      <dd className="font-mono text-[11.5px] text-text">{def.meta.hints.base_url}</dd>
      <dt className="text-text-4">建议模型</dt>
      <dd className="text-text">{def.meta.hints.suggested_models.map((m) => m.label).join("、")}</dd>
    </dl>
  );
}

export type SameIdentityChoice = { kind: "copy" } | { kind: "overwrite"; id: number };

export function BlockSameIdentity({ entry, choice, onChoose }: { entry: EntryView; choice: SameIdentityChoice; onChoose: (c: SameIdentityChoice) => void }) {
  const dups = LOCAL_SAME_IDENTITY[`${entry.sourceId}/${entry.slug}`] ?? [];
  if (dups.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-text-2">已存在同作者、同名的端点：</p>
      <div className="flex gap-2">
        {dups.map((d) => (
          <label key={d.id} className={radioCardClass(choice.kind === "overwrite" && choice.id === d.id)}>
            <input type="radio" name="proto-dup" className="sr-only" checked={choice.kind === "overwrite" && choice.id === d.id} onChange={() => onChoose({ kind: "overwrite", id: d.id })} />
            覆盖「{d.name}」
            <span className="block font-mono text-[10.5px] text-text-4">v{d.version} · {d.key}</span>
          </label>
        ))}
        <label className={radioCardClass(choice.kind === "copy")}>
          <input type="radio" name="proto-dup" className="sr-only" checked={choice.kind === "copy"} onChange={() => onChoose({ kind: "copy" })} />
          新建副本
          <span className="block font-mono text-[10.5px] text-text-4">保留既有端点</span>
        </label>
      </div>
    </div>
  );
}

export function ModifiedWarning({ entry }: { entry: EntryView }) {
  if (!entry.installation?.modified) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-warn/35 bg-warn/8 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[12px] text-text-2">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
        你的本地修改会被覆盖
      </p>
      <button type="button" className={GHOST_BTN_CLS}>
        <Download className="h-3.5 w-3.5" aria-hidden />先导出当前定义
      </button>
    </div>
  );
}

export function BlockSuccess({ entry }: { entry: EntryView }) {
  return (
    <div className="rounded-[8px] border border-good/30 bg-good/8 p-3">
      <p className="flex items-center gap-1.5 text-[12.5px] text-text">
        <Check className="h-3.5 w-3.5 text-good" aria-hidden />已安装「{entry.name}」v{entry.version}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className={GHOST_BTN_CLS}>用此端点新建供应商</button>
        <button type="button" className={GHOST_BTN_CLS}>打开端点</button>
      </div>
    </div>
  );
}

export function MinVersionNote({ entry }: { entry: EntryView }) {
  if (entry.installable) return null;
  return <Badge tone="muted" title={`当前 ${APP_VERSION}`}>需要 ArcReel ≥ {entry.minAppVersion}</Badge>;
}

export function primaryActionLabel(entry: EntryView): string {
  if (!entry.installation) return "安装";
  return entry.installation.state === "update_available" ? "更新" : "已安装";
}
