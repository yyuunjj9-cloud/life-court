"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * 무료 티어 콜드스타트 대응: 진입 즉시 health를 호출해 잠든 백엔드(Render free)를 깨우고,
 * 응답이 늦으면 안내 배너를 띄운다. 404/5xx는 라우팅 전파 중일 수 있어 재시도한다.
 */
export function WakeBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const slowTimer = setTimeout(() => {
      if (!cancelled) setWaking(true);
    }, 2500);

    (async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await api.health();
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 4000));
        }
      }
      if (!cancelled) {
        clearTimeout(slowTimer);
        setWaking(false);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);

  if (!waking) return null;
  return <div className="wake-banner">법정 문을 여는 중입니다… 첫 접속은 최대 1분 정도 걸릴 수 있습니다 ⚖</div>;
}
