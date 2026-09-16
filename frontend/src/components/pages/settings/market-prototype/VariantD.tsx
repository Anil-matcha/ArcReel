// PROTOTYPE — 一次性代码，不进 main。
// 变体 D「定稿」：#2455 决议的组合——变体 C 的外观（hero 头部 + 海报格），条目不按源分组而是平铺；
// 市场源管理收进弹层（沿 C）；安装确认用弹窗（沿 B）。平铺后源归属靠每张卡片的源片 + 来源筛选片承担，
// 失败源用顶部横幅提示「显示上次成功刷新的快照」。
import { ExternalLink, RefreshCw, Search, Settings2 } from "lucide-react";
import { useState } from "react";

import { GHOST_BTN_CLS, INPUT_CLS, ambientGlowStyle, posterGridStyle } from "@/components/ui/darkroom-tokens";
import { GlassModal } from "@/components/ui/GlassModal";
import { PillSwitch } from "@/components/ui/PillSwitch";

import { CONTRIBUTING_URL, ENTRY_TYPES, STATUS_LABEL, relativeTime, type MarketProto } from "./fixtures";
import { KICKER_ACCENT_CLS, KICKER_CLS, StatusDot } from "./pieces";
import { ConfirmB } from "./VariantB";
import { ManageC, TileC } from "./VariantC";

export const VARIANT_D_NAME = "定稿：平铺货架 + 弹窗";

export function VariantD({ proto }: { proto: MarketProto }) {
  const [query, setQuery] = useState("");
  const [onlyInstalled, setOnlyInstalled] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<Set<number>>(new Set());
  const [manage, setManage] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const enabledSources = proto.sources.filter((s) => s.isEnabled);
  const failing = enabledSources.filter((s) => s.status !== "ok" && s.status !== "never_fetched");
  const items = proto.entries.filter((e) =>
    (sourceFilter.size === 0 || sourceFilter.has(e.sourceId)) &&
    (!onlyInstalled || e.installation) &&
    (!query || `${e.name} ${e.author} ${e.description}`.toLowerCase().includes(query.toLowerCase())),
  );
  const openEntry = proto.entries.find((e) => `${e.sourceId}/${e.slug}` === openKey) ?? null;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56" style={ambientGlowStyle({ at: "30% 0%", intensity: 0.14 })} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-[0.05]" style={posterGridStyle({ size: 36, maskShape: "80% 100% at 50% 0%" })} />
      <div className="relative mx-auto max-w-6xl px-8 pb-16 pt-10">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <div className={KICKER_ACCENT_CLS}>Market · {proto.entries.length} endpoints from {enabledSources.length} sources</div>
            <h2 className="mt-1 font-editorial text-[32px] leading-none text-text">市场</h2>
          </div>
          <label className="relative w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-4" aria-hidden />
            <input className={`${INPUT_CLS} pl-8`} placeholder="搜索名称、作者、描述" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <button type="button" className={GHOST_BTN_CLS} onClick={() => proto.refreshSource("all")}><RefreshCw className="h-3.5 w-3.5" aria-hidden />全部刷新</button>
          <button type="button" className={GHOST_BTN_CLS} onClick={() => setManage(true)}><Settings2 className="h-3.5 w-3.5" aria-hidden />管理市场源</button>
        </div>

        {failing.length > 0 && (
          <div className="mb-5 rounded-[8px] border border-warn/30 bg-warn/8 px-3 py-2 text-[12px] text-text-2">
            {failing.map((s) => (
              <div key={s.id}>
                <strong className="text-text">{s.displayName}</strong>：{STATUS_LABEL[s.status]} · {s.lastError}
                {s.fetchedAt && <>，显示上次成功刷新（{relativeTime(s.fetchedAt)}）的快照</>}
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            {ENTRY_TYPES.map((t) => (
              <button key={t.id} type="button" disabled={!t.available}
                className={`rounded-full border px-3 py-1 text-[12px] ${t.available ? "border-accent/45 bg-accent-dim text-text" : "border-hairline-soft text-text-4"}`}>
                {t.label}{!t.available && <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]">soon</span>}
              </button>
            ))}
          </div>
          <span className="h-4 w-px bg-hairline" aria-hidden />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${KICKER_CLS} mr-1`}>Source</span>
            {enabledSources.map((s) => {
              const on = sourceFilter.has(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={on}
                  onClick={() => setSourceFilter((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${on ? "border-accent/45 bg-accent-dim text-text" : "border-hairline-soft text-text-3 hover:text-text"}`}>
                  <StatusDot source={s} />{s.displayName}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[12px] text-text-3">
            <span id="proto-d-only-installed">仅已安装</span>
            <PillSwitch checked={onlyInstalled} onToggle={() => setOnlyInstalled((v) => !v)} labelledBy="proto-d-only-installed" />
          </div>
        </div>

        {items.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-hairline-soft px-4 py-12 text-center text-[12.5px] text-text-4">没有匹配的条目</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {items.map((e) => <TileC key={`${e.sourceId}/${e.slug}`} entry={e} showSource onOpen={() => setOpenKey(`${e.sourceId}/${e.slug}`)} />)}
          </div>
        )}

        <div className="mt-14 rounded-[12px] border border-dashed border-hairline px-6 py-5 text-center">
          <div className={KICKER_CLS}>Contribute</div>
          <p className="mt-1.5 text-[13px] text-text-2">导出你的端点定义，向官方市场提交 PR。</p>
          <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className={`${GHOST_BTN_CLS} mt-3`}>阅读投稿指引 <ExternalLink className="h-3 w-3" aria-hidden /></a>
        </div>
      </div>

      <GlassModal open={manage} onClose={() => setManage(false)} ariaLabel="管理市场源" widthClassName="w-full max-w-xl">
        <ManageC proto={proto} onClose={() => setManage(false)} />
      </GlassModal>
      <GlassModal open={openEntry != null} onClose={() => setOpenKey(null)} ariaLabel="安装确认" widthClassName="w-full max-w-2xl" panelClassName="max-h-[86vh]">
        {openEntry && <ConfirmB entry={openEntry} proto={proto} onClose={() => setOpenKey(null)} />}
      </GlassModal>
    </div>
  );
}
