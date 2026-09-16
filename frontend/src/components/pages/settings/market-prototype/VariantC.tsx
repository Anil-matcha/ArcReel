// PROTOTYPE — 一次性代码，不进 main。
// 变体 C「按源货架」：单页滚动，条目按市场源顺序分组成一排排「货架」，
// 每个货架头部就是该源的状态与刷新按钮，禁用 / 失败的源以折叠条呈现。
// 点条目 = 整页切换到确认页（面包屑返回）；市场源管理放在一个 GlassModal 抽屉里，
// 用拖拽排序。
import { ArrowLeft, ExternalLink, GripVertical, RefreshCw, Search, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";

import { ACCENT_BTN_CLS, ACCENT_BTN_SM_CLS, ACCENT_BUTTON_STYLE, GHOST_BTN_CLS, ICON_BTN_CLS, INPUT_CLS, ambientGlowStyle, posterGridStyle } from "@/components/ui/darkroom-tokens";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PillSwitch } from "@/components/ui/PillSwitch";

import { CONTRIBUTING_URL, ENTRY_TYPES, STATUS_LABEL, THIRD_PARTY_NOTICE, relativeTime, type EntryView, type MarketProto, type ProtoSource } from "./fixtures";
import {
  Badge, BlockHeader, BlockHints, BlockSameIdentity, BlockSuccess, BlockTrust, BlockValidation, EntryIcon, InstallBadges,
  KICKER_ACCENT_CLS, KICKER_CLS, MinVersionNote, ModifiedWarning, SourceChip, SourceStatusLine, StatusDot, primaryActionLabel, type SameIdentityChoice,
} from "./pieces";

export const VARIANT_C_NAME = "按源货架";

export function VariantC({ proto }: { proto: MarketProto }) {
  const [query, setQuery] = useState("");
  const [manage, setManage] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openEntry = proto.entries.find((e) => `${e.sourceId}/${e.slug}` === openKey) ?? null;

  if (openEntry) return <TakeoverC entry={openEntry} proto={proto} onBack={() => setOpenKey(null)} />;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56" style={ambientGlowStyle({ at: "30% 0%", intensity: 0.14 })} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-[0.05]" style={posterGridStyle({ size: 36, maskShape: "80% 100% at 50% 0%" })} />
      <div className="relative mx-auto max-w-6xl px-8 pb-16 pt-10">
        <div className="mb-8 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <div className={KICKER_ACCENT_CLS}>Market · {proto.entries.length} endpoints from {proto.sources.filter((s) => s.isEnabled).length} sources</div>
            <h2 className="mt-1 font-editorial text-[32px] leading-none text-text">市场</h2>
          </div>
          <label className="relative w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-4" aria-hidden />
            <input className={`${INPUT_CLS} pl-8`} placeholder="搜索全部市场源" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className={GHOST_BTN_CLS} onClick={() => proto.refreshSource("all")}><RefreshCw className="h-3.5 w-3.5" aria-hidden />全部刷新</button>
          <button type="button" className={GHOST_BTN_CLS} onClick={() => setManage(true)}><Settings2 className="h-3.5 w-3.5" aria-hidden />管理市场源</button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {ENTRY_TYPES.map((t) => (
            <button key={t.id} type="button" disabled={!t.available}
              className={`rounded-full border px-3 py-1 text-[12px] ${t.available ? "border-accent/45 bg-accent-dim text-text" : "border-hairline-soft text-text-4"}`}>
              {t.label}{!t.available && <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]">soon</span>}
            </button>
          ))}
        </div>

        <div className="space-y-10">
          {proto.sources.map((s) => {
            const items = proto.entries.filter((e) => e.sourceId === s.id && (!query || `${e.name} ${e.author} ${e.description}`.toLowerCase().includes(query.toLowerCase())));
            if (!s.isEnabled) {
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-[10px] border border-dashed border-hairline-soft px-4 py-2.5 text-[12px] text-text-4">
                  <StatusDot source={s} />
                  <span className="text-text-3">{s.displayName}</span>
                  <span>· 已禁用 · {proto.entryCount(s.id)} 个条目未显示</span>
                  <button type="button" className="ml-auto text-accent-2 hover:underline" onClick={() => proto.toggleSource(s.id)}>启用</button>
                </div>
              );
            }
            if (query && items.length === 0) return null;
            return (
              <section key={s.id} aria-label={s.displayName}>
                <header className="mb-3 flex flex-wrap items-center gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusDot source={s} />
                      <h3 className="text-[15px] font-medium text-text">{s.displayName}</h3>
                      {s.kind === "official" ? <Badge tone="accent">official</Badge> : <Badge>third-party</Badge>}
                      <span className="font-mono text-[10.5px] text-text-4">{items.length}</span>
                    </div>
                    <div className="mt-0.5 pl-4"><SourceStatusLine source={s} /></div>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    {s.homepage && <a href={s.homepage} target="_blank" rel="noreferrer" className={ICON_BTN_CLS} title="打开仓库"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <button type="button" className={ICON_BTN_CLS} title="刷新此来源" onClick={() => proto.refreshSource(s.id)}><RefreshCw className="h-3.5 w-3.5" /></button>
                  </div>
                </header>
                {items.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-hairline-soft px-4 py-6 text-center text-[12px] text-text-4">
                    {s.status === "unsupported_schema" ? "索引版本高于当前 ArcReel，升级后可浏览" : "此来源暂无调用端点"}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {items.map((e) => <TileC key={e.slug} entry={e} onOpen={() => setOpenKey(`${e.sourceId}/${e.slug}`)} />)}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-14 rounded-[12px] border border-dashed border-hairline px-6 py-5 text-center">
          <div className={KICKER_CLS}>Contribute</div>
          <p className="mt-1.5 text-[13px] text-text-2">导出你的端点定义，向官方市场提交 PR。</p>
          <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className={`${GHOST_BTN_CLS} mt-3`}>阅读投稿指引 <ExternalLink className="h-3 w-3" aria-hidden /></a>
        </div>
      </div>

      <GlassModal open={manage} onClose={() => setManage(false)} ariaLabel="管理市场源" widthClassName="w-full max-w-xl">
        <ManageC proto={proto} onClose={() => setManage(false)} />
      </GlassModal>
    </div>
  );
}

export function TileC({ entry, onOpen, showSource }: { entry: EntryView; onOpen: () => void; showSource?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex flex-col overflow-hidden rounded-[12px] border border-hairline text-left transition-[transform,border-color] motion-safe:hover:-translate-y-0.5 hover:border-hairline-strong ${entry.installable ? "" : "opacity-60"}`}
      style={{ background: "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.55), oklch(0.16 0.010 265 / 0.55))" }}
    >
      <div className="relative flex aspect-[2/1] items-center justify-center border-b border-hairline-soft" style={{ background: "oklch(0.14 0.010 265 / 0.6)" }}>
        <div className="absolute inset-0 opacity-[0.06]" style={posterGridStyle({ size: 20 })} />
        <EntryIcon entry={entry} size={48} />
        <div className="absolute left-2 top-2 flex gap-1">
          {entry.installation && <InstallBadges state={entry.installation.state} modified={entry.installation.modified} />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="truncate text-[13.5px] font-medium text-text">{entry.name}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-text-4">{entry.author} · v{entry.version}</div>
        <p className="mt-1.5 line-clamp-2 flex-1 text-[11.5px] leading-[1.5] text-text-3">{entry.description}</p>
        {showSource && <div className="mt-2"><SourceChip source={entry.source} /></div>}
        <div className="mt-3 flex items-center justify-between">
          <MinVersionNote entry={entry} />
          <span className={`ml-auto ${entry.installation?.state === "current" ? GHOST_BTN_CLS : ACCENT_BTN_SM_CLS} pointer-events-none`} style={entry.installation?.state === "current" ? undefined : ACCENT_BUTTON_STYLE}>
            {primaryActionLabel(entry)}
          </span>
        </div>
      </div>
    </button>
  );
}

function TakeoverC({ entry, proto, onBack }: { entry: EntryView; proto: MarketProto; onBack: () => void }) {
  const [choice, setChoice] = useState<SameIdentityChoice>({ kind: "copy" });
  const [done, setDone] = useState(false);
  const mode = entry.installation?.state === "update_available" ? "update" : "install";
  const hasError = entry.slug === "internal-gateway-v1";
  const canAct = entry.installable && !hasError && (!entry.installation || mode === "update");
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-text-3 hover:text-text">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />市场 <span className="text-text-4">/</span> {entry.source.displayName} <span className="text-text-4">/</span> <span className="text-text">{entry.name}</span>
      </button>
      <div className="grid grid-cols-[1fr_360px] gap-8">
        <div className="space-y-7">
          <BlockHeader entry={entry} mode={mode} />
          <Block kicker="Validation" title="校验结果"><BlockValidation entry={entry} /></Block>
          <Block kicker="Hints" title="建议配置（仅展示，安装后新建供应商时使用）"><BlockHints entry={entry} /></Block>
          {!entry.installation && <BlockSameIdentity entry={entry} choice={choice} onChoose={setChoice} />}
          {done && <BlockSuccess entry={entry} />}
        </div>
        <aside className="sticky top-6 self-start space-y-4 rounded-[12px] border border-hairline p-5" style={{ background: "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.6), oklch(0.16 0.010 265 / 0.6))" }}>
          <div>
            <div className={KICKER_ACCENT_CLS}>Trust</div>
            <h4 className="mt-1 text-[14px] font-medium text-text">凭证怎么带、发去哪</h4>
          </div>
          <BlockTrust entry={entry} />
          {mode === "update" && <ModifiedWarning entry={entry} />}
          <button type="button" disabled={!canAct} className={`${ACCENT_BTN_CLS} w-full justify-center`} style={ACCENT_BUTTON_STYLE}
            onClick={() => { proto.install(entry, choice.kind === "overwrite" ? choice.id : undefined); setDone(true); }}>
            {mode === "update" ? `更新到 v${entry.version}` : entry.installation ? "已安装" : "确认安装"}
          </button>
          {entry.installation && (
            <button type="button" className={`${GHOST_BTN_CLS} w-full justify-center text-danger`} onClick={() => { proto.uninstall(entry); onBack(); }}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden />卸载（删除端点）
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Block({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className={KICKER_ACCENT_CLS}>{kicker}</div>
      <h4 className="mb-2.5 mt-1 text-[14px] font-medium text-text">{title}</h4>
      {children}
    </section>
  );
}

export function ManageC({ proto, onClose }: { proto: MarketProto; onClose: () => void }) {
  const [address, setAddress] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  return (
    <div className="flex max-h-[80vh] flex-col">
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <div className={KICKER_ACCENT_CLS}>Sources</div>
          <h3 className="mt-1 text-[16px] font-medium text-text">管理市场源</h3>
          <p className="mt-0.5 text-[12px] text-text-3">拖拽调整展示顺序。禁用的来源保留登记但不显示条目。</p>
        </div>
        <ModalCloseButton onClick={onClose} />
      </div>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-5 py-4">
        {proto.sources.map((s, idx) => <ManageRowC key={s.id} s={s} idx={idx} proto={proto} dragId={dragId} setDragId={setDragId} />)}
      </ul>
      <form className="space-y-2 border-t border-hairline-soft px-5 py-4" onSubmit={(e) => { e.preventDefault(); if (address.trim()) { proto.addSource(address.trim()); setAddress(""); } }}>
        <div className="flex gap-2">
          <input className={INPUT_CLS} placeholder="添加：owner/repo[@ref] 或索引 URL" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button type="submit" className={ACCENT_BTN_SM_CLS} style={ACCENT_BUTTON_STYLE} disabled={!address.trim()}>添加</button>
        </div>
        <p className="text-[11px] leading-[1.5] text-text-4"><strong className="text-text-3">{THIRD_PARTY_NOTICE.title}</strong> — {THIRD_PARTY_NOTICE.body}</p>
      </form>
    </div>
  );
}

function ManageRowC({ s, idx, proto, dragId, setDragId }: { s: ProtoSource; idx: number; proto: MarketProto; dragId: number | null; setDragId: (id: number | null) => void }) {
  return (
    <li
      draggable
      onDragStart={() => setDragId(s.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => { if (dragId != null) proto.moveSource(dragId, idx); setDragId(null); }}
      className={`flex items-center gap-2.5 rounded-[8px] border border-hairline-soft bg-bg-grad-a/40 px-2.5 py-2 ${dragId === s.id ? "opacity-40" : ""}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-4" aria-hidden />
      <StatusDot source={s} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-[13px] ${s.isEnabled ? "text-text" : "text-text-4"}`}>{s.displayName}</span>
          {s.kind === "official" && <Badge tone="accent">official</Badge>}
        </div>
        <div className="truncate font-mono text-[10.5px] text-text-4">{s.address}</div>
        <div className="text-[11px] text-text-4">
          {STATUS_LABEL[s.status]} · 上次成功刷新 {relativeTime(s.fetchedAt)}{s.lastError && <span className="text-warn"> · {s.lastError}</span>}
        </div>
      </div>
      <button type="button" className={ICON_BTN_CLS} title="刷新" onClick={() => proto.refreshSource(s.id)}><RefreshCw className="h-3.5 w-3.5" /></button>
      <button type="button" className={ICON_BTN_CLS} title={s.kind === "official" ? "官方市场源不可删除" : "删除"} disabled={s.kind === "official"} onClick={() => proto.removeSource(s.id)}><Trash2 className="h-3.5 w-3.5" /></button>
      <span id={`proto-c-src-${s.id}`} className="sr-only">{s.displayName}</span>
      <PillSwitch checked={s.isEnabled} onToggle={() => proto.toggleSource(s.id)} labelledBy={`proto-c-src-${s.id}`} />
    </li>
  );
}
