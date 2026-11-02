import type { Metadata } from "next";
import { decodeSharedCase } from "@/lib/share";
import { SharedScreen } from "./shared-screen";

/**
 * 공유 링크의 사건 데이터로 사건별 OG 태그·카드를 만든다.
 * 크롤러는 JS를 실행하지 않으므로 메타태그는 서버 컴포넌트에서 생성해야 한다.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}): Promise<Metadata> {
  const { d } = await searchParams;
  const shared = d ? decodeSharedCase(d) : null;
  if (!shared?.display) return { title: "공유받은 판결문" };

  const { caseName, crime, result } = shared.display;
  const title = `『${caseName}』 판결문`;
  const description = `가상 죄명 ${crime} — ${result}. 오늘의 생활법원이 엄숙하게 심리했습니다.`;
  const ogImage = `/api/og?n=${encodeURIComponent(caseName)}&c=${encodeURIComponent(crime)}&r=${encodeURIComponent(result)}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 오늘의 생활법원`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function SharedPage() {
  return <SharedScreen />;
}
