"use client";

import { useRef, useState } from "react";
import { toBlob } from "html-to-image";
import { VerdictDoc } from "@/components/VerdictDoc";
import type { Verdict } from "@/domain/judgment";

/* 공유받은 판결문 저장 버튼 — 접수 당사자의 로컬 기록 없이 화면의 판결문만으로 PNG를 만든다. */
export function SaveVerdictImage({ verdict }: { verdict: Verdict }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(false);
    try {
      const node = stageRef.current;
      if (!node) throw new Error("no stage");
      const opts = { pixelRatio: 2, backgroundColor: "#f4e9d0" };
      // iOS Safari는 첫 캡처가 비어 나오는 경우가 있어 한 번 워밍업 후 실제 캡처
      await toBlob(node, opts);
      const blob = await toBlob(node, opts);
      if (!blob) throw new Error("capture failed");
      const filename = `${verdict.caseNo.replace(/\s/g, "_")}_판결문.png`;
      const file = new File([blob], filename, { type: "image/png" });
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

  return (
    <>
      {error && <div className="help err">저장에 실패했습니다. 다시 시도해주세요.</div>}
      <button className="btn dark sm" type="button" onClick={save} disabled={saving}>
        {saving ? "저장 중..." : "판결문 저장"}
      </button>
      {/* 이미지 캡처용 원본(오프스크린 래퍼 안의 static 노드를 캡처) */}
      <div className="capture-stage" aria-hidden="true">
        <div className="capture-inner" ref={stageRef}>
          <VerdictDoc verdict={verdict} />
          <div className="capture-mark">오늘의 생활법원 · life-court.vercel.app</div>
        </div>
      </div>
    </>
  );
}
