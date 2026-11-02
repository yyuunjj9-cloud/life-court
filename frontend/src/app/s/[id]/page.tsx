import type { Metadata } from "next";
import type { Verdict } from "@/domain/judgment";
import { parseShortShareId } from "@/lib/share";
import { ShortSharedScreen } from "./short-shared-screen";

/** 서버 간 호출용 백엔드 주소 — 프록시(next rewrites)는 브라우저 전용이라 직접 때린다. */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://life-court-api.onrender.com";

/** 판결은 불변이므로 하루 캐시 — 콜드스타트를 요청마다 치르지 않는다. */
async function fetchSharedVerdict(id: string): Promise<Verdict | null> {
  const parsed = parseShortShareId(id);
  if (!parsed) return null;
  try {
    const res = await fetch(`${API_BASE}/api/cases/${parsed.seq}?t=${parsed.token}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const rec = (await res.json()) as { verdict?: Verdict };
    return rec.verdict ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const verdict = await fetchSharedVerdict(id);
  if (!verdict) return { title: "공유받은 판결문" };

  const title = `『${verdict.caseName}』 판결문`;
  const description = `가상 죄명 ${verdict.crime} — ${verdict.result}. 오늘의 생활법원이 엄숙하게 심리했습니다.`;
  const ogImage = `/api/og?n=${encodeURIComponent(verdict.caseName)}&c=${encodeURIComponent(verdict.crime)}&r=${encodeURIComponent(verdict.result)}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 오늘의 생활법원`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function ShortSharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const verdict = await fetchSharedVerdict(id);
  return <ShortSharedScreen verdict={verdict} />;
}
