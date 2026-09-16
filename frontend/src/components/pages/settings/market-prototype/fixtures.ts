// PROTOTYPE — 一次性代码，不进 main。
// 设置页「市场」小节的内存夹具与假状态机：市场源（五种 status）、市场条目（索引字段投影）、
// 安装记录（两轴状态）。所有动作只改内存，不打后端。
import { useCallback, useMemo, useState } from "react";

export const APP_VERSION = "0.30.0";
export const OFFICIAL_REPO_URL = "https://github.com/ArcReel/arcreel-market";
export const CONTRIBUTING_URL = `${OFFICIAL_REPO_URL}/blob/main/CONTRIBUTING.md`;

export type SourceStatus =
  | "never_fetched"
  | "ok"
  | "unreachable"
  | "invalid_index"
  | "unsupported_schema";

export interface ProtoSource {
  id: number;
  kind: "official" | "custom";
  displayName: string;
  address: string;
  indexUrl: string;
  homepage: string | null;
  description: string | null;
  isEnabled: boolean;
  status: SourceStatus;
  /** 上次成功刷新时间（ISO）；never_fetched 为 null。失败时保留上次成功值。 */
  fetchedAt: string | null;
  lastError: string | null;
  refreshing?: boolean;
}

export interface ProtoEntry {
  sourceId: number;
  type: "endpoint";
  slug: string;
  name: string;
  author: string;
  version: string;
  description: string;
  homepage?: string;
  mediaType: "video";
  hasIcon: boolean;
  minAppVersion?: string;
}

export interface ProtoInstallation {
  sourceId: number;
  sourceKey: string;
  slug: string;
  endpointId: number;
  endpointName: string;
  installedVersion: string;
  installedAt: string;
  modified: boolean;
}

export type EntryState = "current" | "update_available";

export interface EntryView extends ProtoEntry {
  source: ProtoSource;
  installation: (ProtoInstallation & { state: EntryState }) | null;
  /** min_app_version 不满足时为 false。 */
  installable: boolean;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export function sourceKey(s: ProtoSource): string {
  if (s.address.startsWith("https://") && !s.address.includes("github.com/")) return `url:${s.indexUrl}`;
  const repo = s.address.replace("https://github.com/", "").replace(/\/tree\/.*$/, "");
  return repo.includes("@") ? `github:${repo}` : `github:${repo}@HEAD`;
}

const SOURCES: ProtoSource[] = [
  {
    id: 1,
    kind: "official",
    displayName: "ArcReel 官方市场",
    address: "ArcReel/arcreel-market",
    indexUrl: "https://raw.githubusercontent.com/ArcReel/arcreel-market/HEAD/arcreel-market.json",
    homepage: OFFICIAL_REPO_URL,
    description: "随版预置的官方市场源，条目经 PR 审核与 CI 校验。",
    isEnabled: true,
    status: "ok",
    fetchedAt: minutesAgo(12),
    lastError: null,
  },
  {
    id: 2,
    kind: "custom",
    displayName: "Kaze Studio 端点集",
    address: "kaze-studio/arcreel-endpoints@main",
    indexUrl: "https://raw.githubusercontent.com/kaze-studio/arcreel-endpoints/main/arcreel-market.json",
    homepage: "https://github.com/kaze-studio/arcreel-endpoints",
    description: "工作室内部整理的网关端点。",
    isEnabled: true,
    status: "ok",
    fetchedAt: minutesAgo(3 * 60),
    lastError: null,
  },
  {
    id: 3,
    kind: "custom",
    displayName: "Northwind 内网镜像",
    address: "https://mirror.northwind.example/arcreel-market.json",
    indexUrl: "https://mirror.northwind.example/arcreel-market.json",
    homepage: null,
    description: null,
    isEnabled: true,
    status: "unreachable",
    fetchedAt: minutesAgo(2 * 24 * 60),
    lastError: "连接超时（10 秒）",
  },
  {
    id: 4,
    kind: "custom",
    displayName: "Community Picks",
    address: "https://github.com/someone/community-picks",
    indexUrl: "https://raw.githubusercontent.com/someone/community-picks/HEAD/arcreel-market.json",
    homepage: "https://github.com/someone/community-picks",
    description: null,
    isEnabled: false,
    status: "invalid_index",
    fetchedAt: minutesAgo(9 * 24 * 60),
    lastError: "条目 `Foo Bar` 的 slug 不合规",
  },
  {
    id: 5,
    kind: "custom",
    displayName: "Lab Next",
    address: "lab-next/market@v2",
    indexUrl: "https://raw.githubusercontent.com/lab-next/market/v2/arcreel-market.json",
    homepage: null,
    description: null,
    isEnabled: true,
    status: "unsupported_schema",
    fetchedAt: null,
    lastError: "索引 schema 2.0.0 高于当前 ArcReel 支持的 1.x，请升级",
  },
];

const ENTRIES: ProtoEntry[] = [
  { sourceId: 1, type: "endpoint", slug: "hailuo-02", name: "Hailuo 02", author: "ArcReel", version: "1.2.0", description: "MiniMax Hailuo 02 文生视频 / 图生视频。", homepage: "https://github.com/ArcReel/arcreel-market/tree/main/endpoints/hailuo-02", mediaType: "video", hasIcon: true },
  { sourceId: 1, type: "endpoint", slug: "kling-2-1", name: "Kling 2.1 Master", author: "ArcReel", version: "1.1.0", description: "快手可灵 2.1 Master，支持首尾帧。", mediaType: "video", hasIcon: true },
  { sourceId: 1, type: "endpoint", slug: "veo-3-vertex", name: "Veo 3 (Vertex)", author: "ArcReel", version: "0.9.0", description: "Google Veo 3 经 Vertex AI 长任务接口。", mediaType: "video", hasIcon: true },
  { sourceId: 1, type: "endpoint", slug: "wan-2-2-dashscope", name: "Wan 2.2 (DashScope)", author: "ArcReel", version: "1.0.0", description: "通义万相 2.2 经 DashScope 异步任务接口。", mediaType: "video", hasIcon: false },
  { sourceId: 1, type: "endpoint", slug: "seedance-1-pro", name: "Seedance 1.0 Pro", author: "ArcReel", version: "1.0.0", description: "字节 Seedance 1.0 Pro，依赖 0.32 引入的多参考图输入。", mediaType: "video", hasIcon: true, minAppVersion: "0.32.0" },
  { sourceId: 2, type: "endpoint", slug: "kling-2-1", name: "Kling 2.1（网关版）", author: "Kaze Studio", version: "2.0.1", description: "经工作室网关转发的可灵 2.1，鉴权头不同。", mediaType: "video", hasIcon: false },
  { sourceId: 2, type: "endpoint", slug: "runway-gen4-gateway", name: "Runway Gen-4 Gateway", author: "Kaze Studio", version: "0.3.0", description: "通用网关协议封装的 Gen-4 Turbo。", mediaType: "video", hasIcon: true },
  { sourceId: 2, type: "endpoint", slug: "luma-ray2", name: "Luma Ray 2", author: "Kaze Studio", version: "1.4.0", description: "Luma Ray 2 官方 API。", mediaType: "video", hasIcon: true },
  { sourceId: 3, type: "endpoint", slug: "hailuo-02", name: "Hailuo 02（内网）", author: "Northwind", version: "1.2.0", description: "官方定义的内网代理镜像。", mediaType: "video", hasIcon: false },
  { sourceId: 3, type: "endpoint", slug: "internal-gateway-v1", name: "Northwind Gateway v1", author: "Northwind", version: "0.1.0", description: "内网统一视频网关。", mediaType: "video", hasIcon: false },
  { sourceId: 4, type: "endpoint", slug: "pixverse-v4", name: "PixVerse V4", author: "someone", version: "0.2.0", description: "社区维护。", mediaType: "video", hasIcon: false },
  { sourceId: 4, type: "endpoint", slug: "vidu-q1", name: "Vidu Q1", author: "someone", version: "0.1.0", description: "社区维护。", mediaType: "video", hasIcon: false },
];

const INSTALLATIONS: ProtoInstallation[] = [
  { sourceId: 1, sourceKey: "github:ArcReel/arcreel-market@HEAD", slug: "hailuo-02", endpointId: 11, endpointName: "Hailuo 02", installedVersion: "1.2.0", installedAt: minutesAgo(5 * 24 * 60), modified: false },
  { sourceId: 1, sourceKey: "github:ArcReel/arcreel-market@HEAD", slug: "kling-2-1", endpointId: 12, endpointName: "Kling 2.1 Master", installedVersion: "1.0.0", installedAt: minutesAgo(20 * 24 * 60), modified: true },
  { sourceId: 2, sourceKey: "github:kaze-studio/arcreel-endpoints@main", slug: "luma-ray2", endpointId: 13, endpointName: "Luma Ray 2", installedVersion: "1.4.0", installedAt: minutesAgo(2 * 24 * 60), modified: true },
  { sourceId: 4, sourceKey: "github:someone/community-picks@HEAD", slug: "pixverse-v4", endpointId: 14, endpointName: "PixVerse V4", installedVersion: "0.2.0", installedAt: minutesAgo(30 * 24 * 60), modified: false },
];

/** 本地已有、同作者同名的定义（用户此前手工导入），用于确认页三选。 */
export const LOCAL_SAME_IDENTITY: Record<string, { id: number; key: string; name: string; version: string }[]> = {
  "1/wan-2-2-dashscope": [{ id: 21, key: "wan-2-2-dashscope-import", name: "Wan 2.2 (DashScope)", version: "0.9.0" }],
};

export function mockDefinition(e: ProtoEntry): Record<string, unknown> {
  const host = e.sourceId === 3 ? "https://gw.northwind.internal" : e.sourceId === 2 ? "https://gateway.kaze.example" : "https://api.example.com";
  return {
    kind: "custom_endpoint",
    schema_version: "1.1.0",
    meta: {
      name: e.name,
      author: e.author,
      version: e.version,
      description: e.description,
      homepage: e.homepage,
      min_app_version: e.minAppVersion,
      hints: { base_url: `${host}/v1`, suggested_models: [{ id: e.slug, label: e.name }] },
    },
    auth: {
      headers: e.sourceId === 2
        ? { "X-Gateway-Key": "{{secret}}", "X-Gateway-Tenant": "kaze" }
        : { Authorization: "Bearer {{secret}}" },
    },
    submit: { method: "POST", url: `${host}/v1/video/generations` },
    poll: { method: "GET", url: `${host}/v1/video/generations/{{task_id}}`, interval_ms: 3000 },
  };
}

export function mockValidation(e: ProtoEntry): { errors: string[]; warnings: string[] } {
  if (e.slug === "internal-gateway-v1") return { errors: ["索引条目 version 0.1.0 与定义 meta.version 0.1.1 不一致"], warnings: [] };
  const warnings: string[] = [];
  if (e.sourceId === 2) warnings.push("auth.headers 含非标准鉴权头 X-Gateway-Key，请确认网关归属");
  if (!e.homepage) warnings.push("meta.homepage 为空");
  return { errors: [], warnings };
}

function semverGte(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return true;
}

export function relativeTime(iso: string | null): string {
  if (!iso) return "从未";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.round(h / 24)} 天前`;
}

export const STATUS_LABEL: Record<SourceStatus, string> = {
  never_fetched: "尚未刷新",
  ok: "正常",
  unreachable: "无法访问",
  invalid_index: "索引无效",
  unsupported_schema: "需升级 ArcReel",
};

export function statusTone(s: SourceStatus): "good" | "warn" | "danger" | "muted" {
  if (s === "ok") return "good";
  if (s === "never_fetched") return "muted";
  if (s === "unreachable") return "warn";
  return "danger";
}

export function useMarketProto() {
  const [sources, setSources] = useState<ProtoSource[]>(SOURCES);
  const [installs, setInstalls] = useState<ProtoInstallation[]>(INSTALLATIONS);

  const entries = useMemo<EntryView[]>(() => {
    const order = new Map(sources.map((s, i) => [s.id, i]));
    return ENTRIES.filter((e) => sources.find((s) => s.id === e.sourceId)?.isEnabled)
      .map((e) => {
        const source = sources.find((s) => s.id === e.sourceId)!;
        const inst = installs.find((i) => i.sourceId === e.sourceId && i.slug === e.slug) ?? null;
        const state: EntryState = inst?.installedVersion === e.version ? "current" : "update_available";
        return {
          ...e,
          source,
          installation: inst ? { ...inst, state } : null,
          installable: !e.minAppVersion || semverGte(APP_VERSION, e.minAppVersion),
        };
      })
      .sort((a, b) => (order.get(a.sourceId)! - order.get(b.sourceId)!) || a.name.localeCompare(b.name));
  }, [sources, installs]);

  const entryCount = useCallback((sourceId: number) => ENTRIES.filter((e) => e.sourceId === sourceId).length, []);

  const toggleSource = useCallback((id: number) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s)));
  }, []);

  const renameSource = useCallback((id: number, displayName: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, displayName } : s)));
  }, []);

  const removeSource = useCallback((id: number) => {
    setSources((prev) => prev.filter((s) => s.id !== id || s.kind === "official"));
  }, []);

  const moveSource = useCallback((id: number, toIndex: number) => {
    setSources((prev) => {
      const from = prev.findIndex((s) => s.id === id);
      if (from < 0 || toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const refreshSource = useCallback((id: number | "all") => {
    setSources((prev) => prev.map((s) => ((id === "all" ? s.isEnabled : s.id === id) ? { ...s, refreshing: true } : s)));
    window.setTimeout(() => {
      setSources((prev) =>
        prev.map((s) => {
          if (!s.refreshing) return s;
          if (s.status === "ok" || s.status === "never_fetched") return { ...s, refreshing: false, status: "ok", fetchedAt: new Date().toISOString(), lastError: null };
          return { ...s, refreshing: false };
        }),
      );
    }, 900);
  }, []);

  const addSource = useCallback((address: string, displayName?: string) => {
    const id = Math.max(...SOURCES.map((s) => s.id), 100) + Math.floor(Math.random() * 1000);
    const indexUrl = address.startsWith("https://") && !address.includes("github.com/")
      ? address
      : `https://raw.githubusercontent.com/${address.replace("https://github.com/", "").replace("@", "/")}${address.includes("@") ? "" : "/HEAD"}/arcreel-market.json`;
    setSources((prev) => [
      ...prev,
      { id, kind: "custom", displayName: displayName?.trim() || address, address, indexUrl, homepage: null, description: null, isEnabled: true, status: "ok", fetchedAt: new Date().toISOString(), lastError: null },
    ]);
  }, []);

  const install = useCallback((e: EntryView, overwriteEndpointId?: number) => {
    setInstalls((prev) => {
      const existing = prev.find((i) => i.sourceId === e.sourceId && i.slug === e.slug);
      const endpointId = overwriteEndpointId ?? existing?.endpointId ?? 100 + prev.length;
      const rest = prev.filter((i) => !(i.sourceId === e.sourceId && i.slug === e.slug));
      return [
        ...rest,
        { sourceId: e.sourceId, sourceKey: sourceKey(e.source), slug: e.slug, endpointId, endpointName: e.name, installedVersion: e.version, installedAt: new Date().toISOString(), modified: false },
      ];
    });
  }, []);

  const uninstall = useCallback((e: EntryView) => {
    setInstalls((prev) => prev.filter((i) => !(i.sourceId === e.sourceId && i.slug === e.slug)));
  }, []);

  return { sources, entries, installs, entryCount, toggleSource, renameSource, removeSource, moveSource, refreshSource, addSource, install, uninstall };
}

export type MarketProto = ReturnType<typeof useMarketProto>;

export const THIRD_PARTY_NOTICE = {
  title: "添加第三方市场源",
  body: "该市场源由第三方维护，其中的内容未经 ArcReel 审核。安装前请先确认来源可信。",
};

export const ENTRY_TYPES = [
  { id: "endpoint", label: "调用端点", available: true },
  { id: "prompt", label: "提示词", available: false },
  { id: "style", label: "风格模板", available: false },
] as const;
