// PROTOTYPE — 一次性代码，不进 main。
// 变体 A「双栏工作台」：沿用调用端点小节的左轨 + 右内容结构。
// 左轨 = 市场源有序列表（拖拽、开关、状态、刷新）+ 类型切换；右侧 = 条目卡片网格；
// 点卡片从右侧滑出抽屉承载详情与安装确认；左轨顶部「添加市场源」在轨内展开表单。
import { ExternalLink, GripVertical, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useState } from "react";

import { ACCENT_BTN_SM_CLS, ACCENT_BUTTON_STYLE, GHOST_BTN_CLS, ICON_BTN_CLS, INPUT_CLS } from "@/components/ui/darkroom-tokens";
import { PillSwitch } from "@/components/ui/PillSwitch";

import { CONTRIBUTING_URL, ENTRY_TYPES, THIRD_PARTY_NOTICE, type EntryView, type MarketProto } from "./fixtures";
import {
  BlockHeader, BlockHints, BlockSameIdentity, BlockSuccess, BlockTrust, BlockValidation, EntryIcon, InstallBadges,
  KICKER_CLS, MinVersionNote, ModifiedWarning, SourceChip, SourceStatusLine, StatusDot, primaryActionLabel, type SameIdentityChoice,
} from "./pieces";

export const VARIANT_A_NAME = "双栏工作台";

export function VariantA({ proto }: { proto: MarketProto }) {
  const [filterSource, setFilterSource] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [address, setAddress] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const visible = proto.entries.filter((e) =>
    (filterSource === "all" || e.sourceId === filterSource) &&
    (!query || `${e.name} ${e.author} ${e.description}`.toLowerCase().includes(query.toLowerCase())),
  );
  const openEntry = proto.entries.find((e) => `${e.sourceId}/${e.slug}` === openKey) ?? null;

  return (
    <div className="flex">
      {/* 左轨：市场源 */}
      <nav
        aria-label="市场源"
        className="sticky top-0 max-h-screen w-64 shrink-0 self-start overflow-y-auto border-r border-hairline-soft px-3 py-5"
        style={{ background: "oklch(0.16 0.010 265 / 0.45)" }}
      >
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <button type="button" onClick={() => setAdding((v) => !v)} className={`${GHOST_BTN_CLS} flex-1 justify-center`}>
            <Plus className="h-3.5 w-3.5" aria-hidden />添加市场源
          </button>
          <button type="button" onClick={() => proto.refreshSource("all")} className={GHOST_BTN_CLS} title="刷新全部启用的市场源">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {adding && (
          <form
            className="mb-3 space-y-2 rounded-[8px] border border-hairline-soft bg-bg-grad-a/40 p-2.5"
            onSubmit={(e) => { e.preventDefault(); if (address.trim()) { proto.addSource(address.trim()); setAddress(""); setAdding(false); } }}
          >
            <input className={INPUT_CLS} placeholder="owner/repo[@ref] 或索引 URL" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="rounded-[6px] border border-warn/30 bg-warn/8 px-2 py-1.5 text-[11px] leading-[1.5] text-text-2">
              <strong className="text-text">{THIRD_PARTY_NOTICE.title}</strong>
              <br />{THIRD_PARTY_NOTICE.body}
            </div>
            <div className="flex justify-end gap-1.5">
              <button type="button" className={GHOST_BTN_CLS} onClick={() => setAdding(false)}>取消</button>
              <button type="submit" className={ACCENT_BTN_SM_CLS} style={ACCENT_BUTTON_STYLE}>添加并抓取</button>
            </div>
          </form>
        )}

        <div className={`${KICKER_CLS} mb-1.5 px-1`}>Sources</div>
        <button
          type="button"
          onClick={() => setFilterSource("all")}
          className={`mb-0.5 flex w-full items-center justify-between rounded-[8px] border px-3 py-1.5 text-left text-[12.5px] ${filterSource === "all" ? "border-accent/35 bg-accent-dim text-text" : "border-transparent text-text-3 hover:bg-bg-grad-a/50 hover:text-text"}`}
        >
          全部启用的来源
          <span className="font-mono text-[10.5px] text-text-4">{proto.entries.length}</span>
        </button>
        <ul className="space-y-0.5">
          {proto.sources.map((s, idx) => (
            <li
              key={s.id}
              draggable
              onDragStart={() => setDragId(s.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId != null) proto.moveSource(dragId, idx); setDragId(null); }}
              className={`group relative rounded-[8px] border px-1.5 py-1.5 ${filterSource === s.id ? "border-accent/35 bg-accent-dim" : "border-transparent hover:bg-bg-grad-a/50"} ${dragId === s.id ? "opacity-40" : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-text-4 opacity-0 group-hover:opacity-100" aria-hidden />
                <StatusDot source={s} />
                <button
                  type="button"
                  onClick={() => s.isEnabled && setFilterSource(s.id)}
                  className={`min-w-0 flex-1 text-left text-[12.5px] ${s.isEnabled ? "text-text-2" : "text-text-4 line-through"}`}
                >
                  <span className="block truncate">{s.displayName}</span>
                  <SourceStatusLine source={s} dense />
                </button>
                <span className="font-mono text-[10.5px] text-text-4">{proto.entryCount(s.id)}</span>
                <span id={`proto-a-src-${s.id}`} className="sr-only">{s.displayName}</span>
                <PillSwitch checked={s.isEnabled} onToggle={() => proto.toggleSource(s.id)} labelledBy={`proto-a-src-${s.id}`} />
              </div>
              <div className="mt-1 hidden items-center gap-1 pl-6 group-hover:flex">
                <button type="button" className={ICON_BTN_CLS} title="刷新" onClick={() => proto.refreshSource(s.id)}><RefreshCw className="h-3 w-3" /></button>
                <button
                  type="button"
                  className={ICON_BTN_CLS}
                  title={s.kind === "official" ? "官方市场源不可删除，可禁用" : "删除"}
                  disabled={s.kind === "official"}
                  onClick={() => proto.removeSource(s.id)}
                ><Trash2 className="h-3 w-3" /></button>
                <span className="ml-1 truncate font-mono text-[10px] text-text-4">{s.address}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className={`${KICKER_CLS} mb-1.5 mt-5 px-1`}>Types</div>
        {ENTRY_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={!t.available}
            className={`mb-0.5 flex w-full items-center justify-between rounded-[8px] border px-3 py-1.5 text-left text-[12.5px] ${t.available ? "border-accent/35 bg-accent-dim text-text" : "border-transparent text-text-4"}`}
          >
            {t.label}
            {!t.available && <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]">soon</span>}
          </button>
        ))}
      </nav>

      {/* 右侧：目录 */}
      <div className="min-w-0 flex-1 px-6 py-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-editorial text-[20px] text-text">市场</h2>
            <p className="mt-0.5 text-[12px] text-text-3">
              {filterSource === "all" ? "所有启用市场源" : proto.sources.find((s) => s.id === filterSource)?.displayName} · {visible.length} 个调用端点
            </p>
          </div>
          <label className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-4" aria-hidden />
            <input className={`${INPUT_CLS} pl-8`} placeholder="搜索名称、作者、描述" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className={GHOST_BTN_CLS}>
            投稿到官方市场 <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {visible.map((e) => (
            <button
              key={`${e.sourceId}/${e.slug}`}
              type="button"
              onClick={() => setOpenKey(`${e.sourceId}/${e.slug}`)}
              className={`flex items-start gap-3 rounded-[10px] border p-3 text-left transition-colors ${openKey === `${e.sourceId}/${e.slug}` ? "border-accent/35 bg-accent-dim" : "border-hairline hover:border-hairline-strong"} ${e.installable ? "" : "opacity-60"}`}
              style={{ background: openKey === `${e.sourceId}/${e.slug}` ? undefined : "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.45), oklch(0.16 0.010 265 / 0.45))" }}
            >
              <EntryIcon entry={e} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium text-text">{e.name}</span>
                  {e.installation && <InstallBadges state={e.installation.state} modified={e.installation.modified} />}
                  <MinVersionNote entry={e} />
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-text-3">{e.author} · v{e.version}</div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-text-3">{e.description}</p>
                <div className="mt-2"><SourceChip source={e.source} /></div>
              </div>
              <span className={`${e.installation?.state === "current" ? GHOST_BTN_CLS : ACCENT_BTN_SM_CLS} pointer-events-none shrink-0`} style={e.installation?.state === "current" ? undefined : ACCENT_BUTTON_STYLE}>
                {primaryActionLabel(e)}
              </span>
            </button>
          ))}
          {visible.length === 0 && <p className="col-span-full py-10 text-center text-[12.5px] text-text-4">没有匹配的条目</p>}
        </div>
      </div>

      {openEntry && <DrawerA entry={openEntry} proto={proto} onClose={() => setOpenKey(null)} />}
    </div>
  );
}

function DrawerA({ entry, proto, onClose }: { entry: EntryView; proto: MarketProto; onClose: () => void }) {
  const [choice, setChoice] = useState<SameIdentityChoice>({ kind: "copy" });
  const [done, setDone] = useState(false);
  const mode = entry.installation?.state === "update_available" ? "update" : "install";
  const hasError = entry.slug === "internal-gateway-v1";
  const canAct = entry.installable && !hasError && (!entry.installation || mode === "update");

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-[480px] flex-col border-l border-hairline shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.8)]"
      style={{ background: "linear-gradient(180deg, oklch(0.19 0.011 265 / 0.98), oklch(0.15 0.010 265 / 0.98))", backdropFilter: "blur(14px)" }}
      aria-label={`${entry.name} 详情`}
    >
      <div className="flex items-center justify-between border-b border-hairline-soft px-5 py-3">
        <span className={KICKER_CLS}>{mode === "update" ? "Update" : "Install"} · endpoint</span>
        <button type="button" className={ICON_BTN_CLS} onClick={onClose} aria-label="关闭"><X className="h-4 w-4" /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <BlockHeader entry={entry} mode={mode} />
        <Section kicker="Validation"><BlockValidation entry={entry} /></Section>
        <Section kicker="Trust · 凭证去向"><BlockTrust entry={entry} /></Section>
        <Section kicker="Hints"><BlockHints entry={entry} /></Section>
        {!entry.installation && <BlockSameIdentity entry={entry} choice={choice} onChoose={setChoice} />}
        {mode === "update" && <ModifiedWarning entry={entry} />}
        {done && <BlockSuccess entry={entry} />}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-hairline-soft px-5 py-3">
        {entry.installation ? (
          <button type="button" className={`${GHOST_BTN_CLS} text-danger`} onClick={() => { proto.uninstall(entry); onClose(); }}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />卸载
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" className={GHOST_BTN_CLS} onClick={onClose}>取消</button>
          <button
            type="button"
            disabled={!canAct}
            className={ACCENT_BTN_SM_CLS}
            style={ACCENT_BUTTON_STYLE}
            onClick={() => { proto.install(entry, choice.kind === "overwrite" ? choice.id : undefined); setDone(true); }}
          >
            {mode === "update" ? `更新到 v${entry.version}` : entry.installation ? "已安装" : "确认安装"}
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <section>
      <div className={`${KICKER_CLS} mb-1.5`}>{kicker}</div>
      {children}
    </section>
  );
}
