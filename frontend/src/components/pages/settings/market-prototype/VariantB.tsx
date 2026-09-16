// PROTOTYPE — 一次性代码，不进 main。
// 变体 B「页签与登记簿」：居中单栏，顶层分「浏览 / 市场源」两个页签。
// 浏览 = 类型下划线页签 + 工具条（搜索、来源筛选片、仅已安装）+ 密排表格；点行弹 GlassModal 确认页。
// 市场源 = 全宽登记簿：添加表单在顶部 SectionShell，列表行带上下移、开关、状态列与操作列。
import { ArrowDown, ArrowUp, ExternalLink, RefreshCw, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { ACCENT_BTN_SM_CLS, ACCENT_BUTTON_STYLE, CARD_STYLE, GHOST_BTN_CLS, ICON_BTN_CLS, INPUT_CLS } from "@/components/ui/darkroom-tokens";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PillSwitch } from "@/components/ui/PillSwitch";
import { SectionShell } from "@/components/ui/SectionShell";

import { CONTRIBUTING_URL, ENTRY_TYPES, STATUS_LABEL, THIRD_PARTY_NOTICE, relativeTime, statusTone, type EntryView, type MarketProto } from "./fixtures";
import {
  Badge, BlockHeader, BlockHints, BlockSameIdentity, BlockSuccess, BlockTrust, BlockValidation, EntryIcon, InstallBadges,
  KICKER_ACCENT_CLS, KICKER_CLS, MinVersionNote, ModifiedWarning, SourceChip, StatusDot, primaryActionLabel, type SameIdentityChoice,
} from "./pieces";

export const VARIANT_B_NAME = "页签与登记簿";

export function VariantB({ proto }: { proto: MarketProto }) {
  const [tab, setTab] = useState<"browse" | "sources">("browse");
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className={KICKER_ACCENT_CLS}>Market</div>
          <h2 className="mt-1 font-editorial text-[24px] text-text">市场</h2>
          <p className="mt-1 text-[12.5px] text-text-3">从 GitHub 市场源浏览并安装调用端点。安装后的端点仍可原地编辑。</p>
        </div>
        <div className="inline-flex rounded-[8px] border border-hairline bg-bg-grad-a/55 p-0.5">
          {([["browse", "浏览"], ["sources", `市场源 · ${proto.sources.length}`]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-[6px] px-3 py-1.5 text-[12.5px] transition-colors ${tab === k ? "bg-accent-dim text-accent-2" : "text-text-3 hover:text-text"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "browse" ? <BrowseB proto={proto} /> : <SourcesB proto={proto} />}
    </div>
  );
}

function BrowseB({ proto }: { proto: MarketProto }) {
  const [query, setQuery] = useState("");
  const [onlyInstalled, setOnlyInstalled] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Set<number>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);

  const enabledSources = proto.sources.filter((s) => s.isEnabled);
  const rows = proto.entries.filter((e) =>
    (sourceFilter.size === 0 || sourceFilter.has(e.sourceId)) &&
    (!onlyInstalled || e.installation) &&
    (!query || `${e.name} ${e.author} ${e.description}`.toLowerCase().includes(query.toLowerCase())),
  );
  const openEntry = proto.entries.find((e) => `${e.sourceId}/${e.slug}` === openKey) ?? null;
  const failing = proto.sources.filter((s) => s.isEnabled && s.status !== "ok" && s.status !== "never_fetched");

  return (
    <div>
      <div className="mb-4 flex items-center gap-5 border-b border-hairline-soft">
        {ENTRY_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.available}
            className={`-mb-px border-b-2 px-0.5 pb-2 text-[13px] ${t.available ? "border-accent text-text" : "border-transparent text-text-4"}`}
          >
            {t.label}
            {t.available ? <span className="ml-1.5 font-mono text-[10.5px] text-text-4">{proto.entries.length}</span> : <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]">soon</span>}
          </button>
        ))}
      </div>

      {failing.length > 0 && (
        <div className="mb-3 rounded-[8px] border border-warn/30 bg-warn/8 px-3 py-2 text-[12px] text-text-2">
          {failing.map((s) => (
            <div key={s.id}>
              <strong className="text-text">{s.displayName}</strong>：{STATUS_LABEL[s.status]} · {s.lastError}
              {s.fetchedAt && <>，显示上次成功刷新（{relativeTime(s.fetchedAt)}）的快照</>}
            </div>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-4" aria-hidden />
          <input className={`${INPUT_CLS} pl-8`} placeholder="搜索" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {enabledSources.map((s) => {
            const on = sourceFilter.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSourceFilter((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${on ? "border-accent/45 bg-accent-dim text-text" : "border-hairline-soft text-text-3 hover:text-text"}`}
              >
                <StatusDot source={s} />{s.displayName}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 text-[12px] text-text-3">
          <span id="proto-b-only-installed">仅已安装</span>
          <PillSwitch checked={onlyInstalled} onToggle={() => setOnlyInstalled((v) => !v)} labelledBy="proto-b-only-installed" />
        </div>
        <button type="button" className={GHOST_BTN_CLS} onClick={() => proto.refreshSource("all")}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />全部刷新
        </button>
      </div>

      <div className="overflow-hidden rounded-[10px] border border-hairline" style={CARD_STYLE}>
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className={`${KICKER_CLS} border-b border-hairline-soft text-left`}>
              <th className="px-3 py-2 font-bold">Endpoint</th>
              <th className="px-3 py-2 font-bold">Author</th>
              <th className="px-3 py-2 font-bold">Version</th>
              <th className="px-3 py-2 font-bold">Source</th>
              <th className="px-3 py-2 font-bold">Status</th>
              <th className="w-24 px-3 py-2 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr
                key={`${e.sourceId}/${e.slug}`}
                onClick={() => setOpenKey(`${e.sourceId}/${e.slug}`)}
                className={`cursor-pointer border-b border-hairline-soft last:border-b-0 hover:bg-bg-grad-a/50 ${e.installable ? "" : "opacity-60"}`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <EntryIcon entry={e} size={28} />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-text">{e.name}</div>
                      <div className="truncate text-[11.5px] text-text-4">{e.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-text-2">{e.author}</td>
                <td className="px-3 py-2 font-mono text-[11.5px] text-text-2">
                  {e.installation && e.installation.state === "update_available" ? <>{e.installation.installedVersion} <span className="text-text-4">→</span> <span className="text-accent-2">{e.version}</span></> : e.version}
                </td>
                <td className="px-3 py-2"><SourceChip source={e.source} /></td>
                <td className="px-3 py-2">
                  {e.installation ? <InstallBadges state={e.installation.state} modified={e.installation.modified} /> : <MinVersionNote entry={e} />}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={!e.installable}
                    onClick={(ev) => { ev.stopPropagation(); setOpenKey(`${e.sourceId}/${e.slug}`); }}
                    className={`${e.installation?.state === "current" ? GHOST_BTN_CLS : ACCENT_BTN_SM_CLS} whitespace-nowrap`}
                    style={e.installation?.state === "current" ? undefined : ACCENT_BUTTON_STYLE}
                  >
                    {e.installation?.state === "current" ? "打开" : primaryActionLabel(e)}
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-text-4">没有匹配的条目</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11.5px] text-text-4">
        想让自己的端点出现在这里？<a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className="text-accent-2 hover:underline">向官方市场投稿 <ExternalLink className="inline h-3 w-3" aria-hidden /></a>
      </p>

      <GlassModal open={openEntry != null} onClose={() => setOpenKey(null)} ariaLabel="安装确认" widthClassName="w-full max-w-2xl" panelClassName="max-h-[86vh]">
        {openEntry && <ConfirmB entry={openEntry} proto={proto} onClose={() => setOpenKey(null)} />}
      </GlassModal>
    </div>
  );
}

export function ConfirmB({ entry, proto, onClose }: { entry: EntryView; proto: MarketProto; onClose: () => void }) {
  const [choice, setChoice] = useState<SameIdentityChoice>({ kind: "copy" });
  const [done, setDone] = useState(false);
  const mode = entry.installation?.state === "update_available" ? "update" : "install";
  const hasError = entry.slug === "internal-gateway-v1";
  const canAct = entry.installable && !hasError && (!entry.installation || mode === "update");
  return (
    <div className="flex max-h-[86vh] flex-col">
      <div className="flex items-center justify-between px-6 pt-5">
        <span className={KICKER_ACCENT_CLS}>{mode === "update" ? "Update endpoint" : "Install endpoint"}</span>
        <ModalCloseButton onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
        <BlockHeader entry={entry} mode={mode} />
        <div className="grid grid-cols-2 gap-4">
          <Card kicker="Validation"><BlockValidation entry={entry} /></Card>
          <Card kicker="Hints"><BlockHints entry={entry} /></Card>
        </div>
        <Card kicker="Trust · 凭证怎么带、发去哪"><BlockTrust entry={entry} /></Card>
        {!entry.installation && <BlockSameIdentity entry={entry} choice={choice} onChoose={setChoice} />}
        {mode === "update" && <ModifiedWarning entry={entry} />}
        {done && <BlockSuccess entry={entry} />}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-hairline-soft px-6 py-3">
        {entry.installation ? (
          <button type="button" className={`${GHOST_BTN_CLS} text-danger`} onClick={() => { proto.uninstall(entry); onClose(); }}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />卸载
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" className={GHOST_BTN_CLS} onClick={onClose}>取消</button>
          <button type="button" disabled={!canAct} className={ACCENT_BTN_SM_CLS} style={ACCENT_BUTTON_STYLE}
            onClick={() => { proto.install(entry, choice.kind === "overwrite" ? choice.id : undefined); setDone(true); }}>
            {mode === "update" ? `更新到 v${entry.version}` : entry.installation ? "已安装" : "确认安装"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-hairline-soft bg-bg-grad-a/35 p-3">
      <div className={`${KICKER_CLS} mb-2`}>{kicker}</div>
      {children}
    </div>
  );
}

function SourcesB({ proto }: { proto: MarketProto }) {
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const isThirdParty = address.trim().length > 0;
  return (
    <div className="space-y-6">
      <SectionShell kicker="Add source" title="添加市场源" description="GitHub 仓库（owner/repo[@ref] 或仓库 URL），或以 arcreel-market.json 结尾的索引 URL。添加时立即抓取并校验。">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (address.trim()) { proto.addSource(address.trim(), name); setAddress(""); setName(""); } }}>
          <div className="grid grid-cols-[1fr_220px_auto] gap-2">
            <input className={INPUT_CLS} placeholder="owner/repo[@ref]" value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className={INPUT_CLS} placeholder="显示名（默认取索引 name）" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className={ACCENT_BTN_SM_CLS} style={ACCENT_BUTTON_STYLE} disabled={!address.trim()}>添加并抓取</button>
          </div>
          {isThirdParty && (
            <div className="rounded-[8px] border border-warn/30 bg-warn/8 px-3 py-2 text-[12px] leading-[1.55] text-text-2">
              <strong className="text-text">{THIRD_PARTY_NOTICE.title}</strong> — {THIRD_PARTY_NOTICE.body}
            </div>
          )}
        </form>
      </SectionShell>

      <SectionShell
        kicker="Sources"
        title="市场源"
        description="按顺序合并展示条目；禁用的来源不出现在浏览页，但保留登记。官方市场源可禁用、不可删除。"
        trailing={<button type="button" className={GHOST_BTN_CLS} onClick={() => proto.refreshSource("all")}><RefreshCw className="h-3.5 w-3.5" aria-hidden />全部刷新</button>}
      >
        <ol className="-m-4 divide-y divide-hairline-soft">
          {proto.sources.map((s, idx) => (
            <li key={s.id} className={`grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 px-4 py-3 ${s.isEnabled ? "" : "opacity-60"}`}>
              <div className="flex flex-col">
                <button type="button" className={ICON_BTN_CLS} aria-label="上移" disabled={idx === 0} onClick={() => proto.moveSource(s.id, idx - 1)}><ArrowUp className="h-3 w-3" /></button>
                <button type="button" className={ICON_BTN_CLS} aria-label="下移" disabled={idx === proto.sources.length - 1} onClick={() => proto.moveSource(s.id, idx + 1)}><ArrowDown className="h-3 w-3" /></button>
              </div>
              <span className="font-mono text-[11px] text-text-4">{String(idx + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <input
                    className="min-w-0 max-w-[260px] truncate rounded-[5px] border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-text hover:border-hairline focus:border-accent/55 focus-visible:outline-none"
                    value={s.displayName}
                    onChange={(e) => proto.renameSource(s.id, e.target.value)}
                    aria-label="显示名"
                  />
                  {s.kind === "official" ? <Badge tone="accent">official</Badge> : <Badge>third-party</Badge>}
                  <Badge tone={statusTone(s.status)}>{s.refreshing ? "刷新中" : STATUS_LABEL[s.status]}</Badge>
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-text-4">{s.address}</div>
                <div className="mt-0.5 text-[11.5px] text-text-3">
                  {proto.entryCount(s.id)} 个条目 · 上次成功刷新 {relativeTime(s.fetchedAt)}
                  {s.lastError && <span className="text-warn"> · {s.lastError}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className={ICON_BTN_CLS} title="刷新" onClick={() => proto.refreshSource(s.id)}><RefreshCw className="h-3.5 w-3.5" /></button>
                {s.homepage && <a href={s.homepage} target="_blank" rel="noreferrer" className={ICON_BTN_CLS} title="打开仓库"><ExternalLink className="h-3.5 w-3.5" /></a>}
                <button type="button" className={ICON_BTN_CLS} title={s.kind === "official" ? "官方市场源不可删除（409）" : "删除"} disabled={s.kind === "official"} onClick={() => proto.removeSource(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex items-center gap-2">
                <span id={`proto-b-src-${s.id}`} className="text-[11.5px] text-text-3">{s.isEnabled ? "启用" : "停用"}</span>
                <PillSwitch checked={s.isEnabled} onToggle={() => proto.toggleSource(s.id)} labelledBy={`proto-b-src-${s.id}`} />
              </div>
            </li>
          ))}
        </ol>
      </SectionShell>
    </div>
  );
}
