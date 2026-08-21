"use client";

import { useEffect, useRef, useState } from "react";
import { useCaseStore } from "@/store/case-store";

/** 접수 초안 임시저장 버튼. 저장 후 잠시 완료 표시를 보여준다. */
export function DraftSaveButton() {
  const { saveDraft } = useCaseStore();
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onClick = () => {
    saveDraft();
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 2000);
  };

  return (
    <button className="btn line sm" type="button" onClick={onClick}>
      {saved ? "임시저장 완료 ✓" : "임시저장"}
    </button>
  );
}
