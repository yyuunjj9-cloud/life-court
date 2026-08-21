"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toJpeg, toPng } from "html-to-image";
import { AppealDoc, VerdictDoc } from "@/components/VerdictDoc";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

type Format = "png" | "jpg";

/* 08 판결문 저장 */
function SaveScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const isAppeal = params.get("doc") === "appeal";
  const { verdict, appeal } = useCaseStore();
  const [format, setFormat] = useState<Format>("png");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!verdict) router.replace("/");
  }, [verdict, router]);

  if (!verdict) return <div className="scr" />;

  const showAppeal = isAppeal && appeal !== null;
  const doc = showAppeal ? (
    <AppealDoc verdict={verdict} appeal={appeal} date={formatKoreanDate(new Date())} />
  ) : (
    <VerdictDoc verdict={verdict} />
  );

  const save = async () => {
    const node = stageRef.current;
    if (!node || saving) return;
    setSaving(true);
    setError(false);
    try {
      const opts = { pixelRatio: 2, backgroundColor: "#f4e9d0" };
      const dataUrl =
        format === "png" ? await toPng(node, opts) : await toJpeg(node, { ...opts, quality: 0.95 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${verdict.caseNo.replace(/\s/g, "_")}${showAppeal ? "_항소심" : ""}_판결문.${format}`;
      a.click();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scr">
      <div className="pad">
        <h1 className="tt" style={{ fontSize: 19 }}>
          판결문 저장
        </h1>
        <div className="thumbwrap">{doc}</div>
        <p className="lbl" style={{ marginTop: 22 }}>
          저장할 형식
        </p>
        <div className="fmt">
          <button className="opt" type="button" aria-pressed={format === "png"} onClick={() => setFormat("png")}>
            <span className="chk">✓</span>이미지 (PNG)
          </button>
          <button className="opt" type="button" aria-pressed={format === "jpg"} onClick={() => setFormat("jpg")}>
            <span className="chk">✓</span>이미지 (JPG)
          </button>
        </div>
        {error && <div className="help err">저장에 실패했습니다. 다시 시도해주세요.</div>}
        <div className="grow" />
        <div className="stack">
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장하기"}
          </button>
          <button className="btn line" type="button" onClick={() => router.push(showAppeal ? "/appeal" : "/verdict")}>
            취소
          </button>
        </div>
      </div>
      {/* 이미지 캡처용 원본(오프스크린) */}
      <div className="capture-stage" ref={stageRef} aria-hidden="true">
        {doc}
      </div>
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense fallback={<div className="scr" />}>
      <SaveScreen />
    </Suspense>
  );
}
