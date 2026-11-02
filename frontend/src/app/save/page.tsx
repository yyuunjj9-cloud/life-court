"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toBlob, toJpeg } from "html-to-image";
import { AppealDoc, VerdictDoc } from "@/components/VerdictDoc";
import { ComplaintDocView, CountersuitDocView, DemandDocView } from "@/components/LegalDocs";
import { formatKoreanDate } from "@/domain/date";
import { shortShareId } from "@/lib/share";
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

const SITE_URL = "https://life-court.vercel.app";

/* 08 문서 저장 */
function SaveScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { verdict, appeal, complaint, countersuit, demand, shareToken, caseSeq, hydrated } = useCaseStore();
  const [format, setFormat] = useState<Format>("png");
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
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
    if (hydrated && !docExists) router.replace(verdict ? "/verdict" : "/");
  }, [docExists, verdict, router, hydrated]);

  if (!doc) return <div className="scr" />;

  /** 문서를 이미지 파일로 캡처한다. 저장·공유가 공용으로 쓴다. */
  const captureFile = async (): Promise<File> => {
    const node = stageRef.current;
    if (!node) throw new Error("no stage");
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
    return new File([blob], filename, { type: format === "png" ? "image/png" : "image/jpeg" });
  };

  const save = async () => {
    if (saving || sharing) return;
    setSaving(true);
    setError(false);
    setCopied(false);
    try {
      const file = await captureFile();
      // 아이폰/모바일: 공유 시트로 저장(사진에 저장 가능). 데스크톱: 파일 다운로드.
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "오늘의 생활법원" });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e; // 사용자가 취소한 경우는 정상 종료
        }
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  /** 이미지 + 사이트 링크를 함께 공유한다. 공유 미지원 환경에서는 링크를 복사한다. */
  const share = async () => {
    if (saving || sharing) return;
    setSharing(true);
    setError(false);
    setCopied(false);
    try {
      // 접수된 사건이면 원본 판결문을 여는 짧은 링크를, 아니면 사이트 링크를 공유한다.
      const shareUrl =
        verdict && caseSeq !== null && shareToken
          ? `${SITE_URL}/s/${shortShareId(caseSeq, shareToken)}`
          : SITE_URL;
      const shareText = `생활법원 ${DOC_LABEL[kind]}이 도착했습니다 — 당신의 억울함도 접수하세요: ${shareUrl}`;
      if (typeof navigator !== "undefined" && navigator.share) {
        const file = await captureFile();
        const withFile = { files: [file], title: "오늘의 생활법원", text: shareText };
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share(withFile);
          } else {
            await navigator.share({ title: "오늘의 생활법원", text: shareText, url: shareUrl });
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
      }
    } catch {
      setError(true);
    } finally {
      setSharing(false);
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
        {verdict && !shareToken && <p className="help">이전에 접수한 사건은 이미지로 공유할 수 있습니다. 판결문 링크는 새 사건부터 제공됩니다.</p>}
        {error && <div className="help err">저장에 실패했습니다. 다시 시도해주세요.</div>}
        {copied && <div className="help">공유 문구와 링크가 복사되었습니다. 원하는 곳에 붙여넣으세요.</div>}
        <div className="grow" />
        <div className="stack">
          <button className="btn" type="button" onClick={share} disabled={saving || sharing}>
            {sharing ? "공유 준비 중..." : "공유하기"}
          </button>
          <div className="btn-row">
            <button className="btn dark sm" type="button" onClick={save} disabled={saving || sharing}>
              {saving ? "저장 중..." : "저장하기"}
            </button>
            <button className="btn line sm" type="button" onClick={() => router.push(DOC_BACK[kind])}>
              취소
            </button>
          </div>
        </div>
      </div>
      {/* 이미지 캡처용 원본(오프스크린 래퍼 안의 static 노드를 캡처) */}
      <div className="capture-stage" aria-hidden="true">
        <div className="capture-inner" ref={stageRef}>
          {doc}
          <div className="capture-mark">오늘의 생활법원 · life-court.vercel.app</div>
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
