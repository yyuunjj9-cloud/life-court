"use client";

import { useId } from "react";
import type { ModerationIssue } from "@/domain/moderation";
import { Burst } from "@/components/Burst";

export function IntakeRejection({ issue, onEdit }: { issue: ModerationIssue; onEdit: () => void }) {
  const heading = useId();
  return <section className="intake-rejection" role="alert" aria-labelledby={heading}>
    <div className="rejection-stamp" aria-hidden="true"><Burst text="Inadmissible!" variant="inadmissible" width={180} /></div>
    <h2 id={heading}>진술 보완 요청</h2>
    <p className="rejection-lead">이 내용은 접수할 수 없습니다.</p>
    <p>{issue.message}</p>
    <button type="button" className="btn line sm" onClick={onEdit}>진술 수정하기</button>
  </section>;
}
