import type { Metadata } from "next";
import type { Verdict } from "@/domain/judgment";
import type { DefenseResponseDoc } from "@/domain/response";
import { parseShortShareId } from "@/lib/share";
import { ShortSharedScreen, type SharedCase } from "./short-shared-screen";

export const dynamic = "force-dynamic";

/**
 * 서버 간 호출용 백엔드 주소 — 프록시(next rewrites)는 브라우저 전용이라 직접 때린다.
 * trim(): Vercel 환경변수에 BOM(U+FEFF) 등 보이지 않는 문자가 섞이면 URL 파싱이 터진다(실제 발생).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://life-court-api.onrender.com").trim();

/**
 * 저장된 원본 판결 조회. 반드시 유한 시간 안에 끝나야 한다 —
 * generateMetadata가 영원히 pending이면 SSR 스트림이 닫히지 않는다.
 */
async function fetchSharedCase(id: string): Promise<SharedCase | null> {
  const parsed = parseShortShareId(id);
  if (!parsed) return null;
  try {
    const res = await fetch(`${API_BASE}/api/cases/${parsed.seq}?t=${parsed.token}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const rec = (await res.json()) as { verdict?: Verdict; responseDoc?: DefenseResponseDoc | null };
    if (!rec.verdict) return null;
    return { verdict: rec.verdict, responseDoc: rec.responseDoc ?? null, seq: parsed.seq, token: parsed.token };
  } catch (e) {
    console.error(`[shared] case fetch failed: ${parsed.seq}`, e);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const verdict = (await fetchSharedCase(id))?.verdict ?? null;
  if (!verdict) return { title: "공유받은 판결문", robots: { index: false, follow: false }, referrer: "no-referrer" };

  const title = `『${verdict.caseName}』 판결문`;
  const description = `가상 죄명 ${verdict.crime} — ${verdict.result}. 오늘의 생활법원이 엄숙하게 심리했습니다.`;
  const ogImage = `/api/og?n=${encodeURIComponent(verdict.caseName)}&c=${encodeURIComponent(verdict.crime)}&r=${encodeURIComponent(verdict.result)}`;

  return {
    robots: { index: false, follow: false },
    referrer: "no-referrer",
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
  const shared = await fetchSharedCase(id);
  return <ShortSharedScreen shared={shared} />;
}
