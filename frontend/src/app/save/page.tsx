"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toBlob, toJpeg } from "html-to-image";
import { AppealDoc, VerdictDoc } from "@/components/VerdictDoc";
import { ComplaintDocView, CountersuitDocView, DemandDocView } from "@/components/LegalDocs";
import { formatKoreanDate } from "@/domain/date";
import { useCaseStore } from "@/store/case-store";

type Format = "png" | "jpg";
type DocKind = "verdict" | "appeal" | "complaint" | "demand" | "countersuit";

const DOC_LABEL: Record<DocKind, string> = {
  verdict: "판결문",
  appeal: "항소심 판결문",
  complaint: "고소·고발장",
  demand: "내용증명",
  countersuit: "맞고소장",
};

/** 취소 시 돌아갈 화면 */
const DOC_BACK: Record<DocKind, string> = {
  verdict: "/verdict",
  appeal: "/appeal",
  complaint: "/complaint",
  demand: "/demand",
  countersuit: "/countersuit",
};

/* 08 문서 저장 */
function SaveScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { verdict, appeal, complaint, countersuit, demand } = useCaseStore();
  const [format, setFormat] = useState<Format>("png");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const raw = params.get("doc");
  const kind: DocKind =
    raw === "appeal" || raw === "complaint" || raw === "demand" || raw === "countersuit" ? raw : "verdict";

  const date = formatKoreanDate(new Date());
  const doc = (() => {
    switch (kind) {
      case "appeal":
        return verdict && appeal ? <AppealDoc verdict={verdict} appeal={appeal} date={date} /> : null;
      case "complaint":
        return complaint ? <ComplaintDocView doc={complaint} date={date} /> : null;
      case "demand":
        return demand ? <DemandDocView doc={demand} date={date} /> : null;
      case "countersuit":
        return countersuit ? <CountersuitDocView doc={countersuit} date={date} /> : null;
      default:
        return verdict ? <VerdictDoc verdict={verdict} /> : null;
    }
  })();

  const docExists = doc !== null;
  useEffect(() => {
    if (!docExists) router.replace(verdict ? "/verdict" : "/");
  }, [docExists, verdict, router]);

  if (!doc) return <div className="scr" />;

  const save = async () => {
    const node = stageRef.current;
    if (!node || saving) return;
    setSaving(true);
    setError(false);
    try {
      const opts = { pixelRatio: 2, backgroundColor: "#f4e9d0" };
      // iOS Safari는 첫 캡처가 비어 나오는 경우가 있어 한 번 워밍업 후 실제 캡처
      await toBlob(node, opts);
      let blob: Blob | null;
      if (format === "png") {
        blob = await toBlob(node, opts);
      } else {
        const dataUrl = await toJpeg(node, { ...opts, quality: 0.95 });
        blob = await (await fetch(dataUrl)).blob();
      }
      if (!blob) throw new Error("capture failed");

      const stem = verdict ? verdict.caseNo.replace(/\s/g, "_") : "생활법원";
      const filename = `${stem}_${DOC_LABEL[kind].replace(/[·\s]/g, "")}.${format}`;
      const file = new File([blob], filename, { type: format === "png" ? "image/png" : "image/jpeg" });

      // 아이폰/모바일: 공유 시트로 저장(사진에 저장 가능). 데스크톱: 파일 다운로드.
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "오늘의 생활법원" });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e; // 사용자가 취소한 경우는 정상 종료
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
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
          {DOC_LABEL[kind]} 저장
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
          <button className="btn line" type="button" onClick={() => router.push(DOC_BACK[kind])}>
            취소
          </button>
        </div>
      </div>
      {/* 이미지 캡처용 원본(오프스크린 래퍼 안의 static 노드를 캡처) */}
      <div className="capture-stage" aria-hidden="true">
        <div className="capture-inner" ref={stageRef}>
          {doc}
        </div>
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
