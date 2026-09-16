// PROTOTYPE — 一次性代码，不进 main。
// 设置页「市场」小节的三个变体，挂在现有 `/app/settings?section=market` 上，经 `?variant=a|b|c` 切换。
// 内存夹具由 useMarketProto 提供；切换条右侧「端点详情预览」弹出调用端点详情头部在四种安装状态下的样子。
import { useState } from "react";
import { useSearch } from "wouter";

import { GHOST_BTN_CLS } from "@/components/ui/darkroom-tokens";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PrototypeSwitcher } from "@/components/ui/PrototypeSwitcher";

import { useMarketProto } from "./fixtures";
import { InstallBadges, KICKER_ACCENT_CLS } from "./pieces";
import { VARIANT_A_NAME, VariantA } from "./VariantA";
import { VARIANT_B_NAME, VariantB } from "./VariantB";
import { VARIANT_C_NAME, VariantC } from "./VariantC";

const VARIANTS = [
  { key: "a", name: VARIANT_A_NAME },
  { key: "b", name: VARIANT_B_NAME },
  { key: "c", name: VARIANT_C_NAME },
];

export function MarketPrototypeSection() {
  const search = useSearch();
  const variant = new URLSearchParams(search).get("variant") ?? "a";
  const proto = useMarketProto();
  const [preview, setPreview] = useState(false);

  return (
    <>
      {variant === "b" ? <VariantB proto={proto} /> : variant === "c" ? <VariantC proto={proto} /> : <VariantA proto={proto} />}
      <PrototypeSwitcher
        variants={VARIANTS}
        current={VARIANTS.some((v) => v.key === variant) ? variant : "a"}
        extra={<button type="button" className="rounded-full px-2 py-0.5 text-[11px] hover:bg-black/10" onClick={() => setPreview(true)}>端点详情预览</button>}
      />
      <GlassModal open={preview} onClose={() => setPreview(false)} ariaLabel="端点详情头部预览" widthClassName="w-full max-w-2xl">
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className={KICKER_ACCENT_CLS}>Endpoint detail · installed from market</div>
              <h3 className="mt-1 text-[15px] font-medium text-text">调用端点详情头部：安装记录的四种状态</h3>
              <p className="mt-0.5 text-[12px] text-text-3">市场徽标 + 两轴状态；「更新」只在可更新时出现；删除即卸载。</p>
            </div>
            <ModalCloseButton onClick={() => setPreview(false)} />
          </div>
          <div className="mt-4 space-y-3">
            {([
              ["current", false, "Hailuo 02", "ArcReel 官方市场", "1.2.0"],
              ["update_available", true, "Kling 2.1 Master", "ArcReel 官方市场", "1.0.0 → 1.1.0"],
              ["current", true, "Luma Ray 2", "Kaze Studio 端点集", "1.4.0"],
              ["unavailable", false, "PixVerse V4", "github:someone/community-picks@HEAD（来源已禁用）", "0.2.0"],
            ] as const).map(([state, modified, name, src, ver]) => (
              <div key={name} className="rounded-[10px] border border-hairline px-5 py-4" style={{ background: "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.55), oklch(0.16 0.010 265 / 0.55))" }}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-editorial text-[20px] text-text">{name}</h2>
                      <span className="shrink-0 rounded-[5px] border border-accent/35 bg-accent-dim px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] text-accent-2">custom</span>
                      <InstallBadges state={state} modified={modified} />
                    </div>
                    <div className="mt-1 flex items-center gap-2.5 text-[12px] text-text-3">
                      <span>ArcReel · v{ver}</span>
                      <span aria-hidden>·</span>
                      <span>来自市场 <span className="text-text-2">{src}</span></span>
                    </div>
                  </div>
                  <button type="button" className={GHOST_BTN_CLS}>新建供应商</button>
                  {state === "update_available" && <button type="button" className={`${GHOST_BTN_CLS} border-accent/35 text-accent-2`}>更新</button>}
                  <button type="button" className={GHOST_BTN_CLS}>导出</button>
                  <button type="button" className={`${GHOST_BTN_CLS} text-danger`}>删除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassModal>
    </>
  );
}
