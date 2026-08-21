"use client";

/**
 * 사건 진행 상태 저장소.
 * 안내 제2조에 따라 입력 내용은 브라우저(sessionStorage) 안에서만 사용된다.
 * 사건번호 시퀀스만 localStorage에 남겨 접수할 때마다 번호가 이어지게 한다.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  generateAppeal,
  generateVerdict,
  type AppealVerdict,
  type CaseInput,
  type CaseType,
  type Relationship,
  type Severity,
  type Tone,
  type Verdict,
} from "@/domain/judgment";
import type { FilingKind } from "@/domain/documents";

interface CaseDraft {
  story: string;
  caseType: CaseType | null;
  relationship: Relationship | null;
  severity: Severity;
  tone: Tone;
}

interface CaseState {
  draft: CaseDraft;
  caseSeq: number | null;
  filingKind: FilingKind | null;
  verdict: Verdict | null;
  appeal: AppealVerdict | null;
}

interface CaseStore extends CaseState {
  setStory: (story: string) => void;
  setCaseType: (caseType: CaseType) => void;
  setRelationship: (relationship: Relationship) => void;
  setSeverity: (severity: Severity) => void;
  setTone: (tone: Tone) => void;
  /** 접수 확정: 사건번호를 발급하고 판결을 확정한다. 이미 접수된 사건이면 번호를 재사용한다. */
  submitCase: (kind: FilingKind) => void;
  /** 항소심 판결을 생성한다. */
  fileAppeal: () => void;
  /** 다음 사건번호 미리보기(09 화면용). 소비하지 않는다. */
  peekNextSeq: () => number;
  /** 새 사건 접수를 위해 초기화한다. */
  resetCase: () => void;
}

const DRAFT_INIT: CaseDraft = {
  story: "",
  caseType: null,
  relationship: null,
  severity: 3,
  tone: "fair",
};

const STATE_KEY = "lifecourt.state.v1";
const SEQ_KEY = "lifecourt.caseSeq.v1";
const SEQ_START = 41; // 첫 사건이 제042호가 되도록

function readSeq(): number {
  if (typeof window === "undefined") return SEQ_START;
  const raw = window.localStorage.getItem(SEQ_KEY);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : SEQ_START;
}

const CaseContext = createContext<CaseStore | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>({
    draft: DRAFT_INIT,
    caseSeq: null,
    filingKind: null,
    verdict: null,
    appeal: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STATE_KEY);
      if (raw) setState((prev) => ({ ...prev, ...(JSON.parse(raw) as CaseState) }));
    } catch {
      /* 손상된 저장분은 무시 */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const store = useMemo<CaseStore>(() => {
    const patchDraft = (patch: Partial<CaseDraft>) =>
      setState((s) => ({ ...s, draft: { ...s.draft, ...patch } }));

    return {
      ...state,
      setStory: (story) => patchDraft({ story }),
      setCaseType: (caseType) => patchDraft({ caseType }),
      setRelationship: (relationship) => patchDraft({ relationship }),
      setSeverity: (severity) => patchDraft({ severity }),
      setTone: (tone) => patchDraft({ tone }),
      submitCase: (kind) =>
        setState((s) => {
          const { story, caseType, relationship, severity, tone } = s.draft;
          if (!caseType || !relationship) return s;
          // 접수 방식만 바꿔 다시 접수하는 경우 사건번호를 재사용한다.
          const seq = s.caseSeq ?? readSeq() + 1;
          if (s.caseSeq === null) window.localStorage.setItem(SEQ_KEY, String(seq));
          const input: CaseInput = { story, caseType, relationship, severity, tone };
          return { ...s, caseSeq: seq, filingKind: kind, verdict: generateVerdict(input, seq), appeal: null };
        }),
      fileAppeal: () =>
        setState((s) => {
          const { story, caseType, relationship, severity, tone } = s.draft;
          if (!s.verdict || !caseType || !relationship) return s;
          const input: CaseInput = { story, caseType, relationship, severity, tone };
          return { ...s, appeal: generateAppeal(input, s.verdict) };
        }),
      peekNextSeq: () => readSeq() + 1,
      resetCase: () =>
        setState({ draft: DRAFT_INIT, caseSeq: null, filingKind: null, verdict: null, appeal: null }),
    };
  }, [state]);

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>;
}

export function useCaseStore(): CaseStore {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCaseStore must be used within CaseProvider");
  return ctx;
}
