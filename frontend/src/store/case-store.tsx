"use client";

/**
 * 사건 진행 상태 저장소.
 * 판결·문서 생성은 backend API가 수행하고, 이 저장소는 진행 중인 사건의
 * 입력(draft)과 API가 돌려준 문서들을 sessionStorage에 캐시한다.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  AppealVerdict,
  CaseInput,
  CaseType,
  Relationship,
  Severity,
  Tone,
  Verdict,
} from "@/domain/judgment";
import type { ComplaintDoc, CountersuitDoc, DemandLetterDoc, FilingKind } from "@/domain/documents";
import { api } from "@/lib/api";

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
  complaint: ComplaintDoc | null;
  appeal: AppealVerdict | null;
  countersuit: CountersuitDoc | null;
  demand: DemandLetterDoc | null;
}

interface CaseStore extends CaseState {
  setStory: (story: string) => void;
  setCaseType: (caseType: CaseType) => void;
  setRelationship: (relationship: Relationship) => void;
  setSeverity: (severity: Severity) => void;
  setTone: (tone: Tone) => void;
  /** 접수 확정: API로 사건을 생성하고 판결·고소장을 받아온다. 성공 여부 반환. */
  submitCase: (kind: FilingKind) => Promise<boolean>;
  /** 항소심 판결을 요청한다. */
  fileAppeal: () => Promise<boolean>;
  /** 피고 측 맞고소장을 요청한다. */
  fileCountersuit: () => Promise<boolean>;
  /** 내용증명을 생성한다(사건 접수 아님). */
  createDemand: () => Promise<boolean>;
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

const STATE_INIT: CaseState = {
  draft: DRAFT_INIT,
  caseSeq: null,
  filingKind: null,
  verdict: null,
  complaint: null,
  appeal: null,
  countersuit: null,
  demand: null,
};

const STATE_KEY = "lifecourt.state.v2";

function draftToInput(draft: CaseDraft): CaseInput | null {
  if (!draft.caseType || !draft.relationship || draft.story.trim().length < 10) return null;
  return {
    story: draft.story,
    caseType: draft.caseType,
    relationship: draft.relationship,
    severity: draft.severity,
    tone: draft.tone,
  };
}

const CaseContext = createContext<CaseStore | null>(null);

export function CaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaseState>(STATE_INIT);
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

      submitCase: async (kind) => {
        const input = draftToInput(state.draft);
        if (!input) return false;
        try {
          const { seq, verdict, complaint } = await api.submitCase(input, kind);
          setState((s) => ({
            ...s,
            caseSeq: seq,
            filingKind: kind,
            verdict,
            complaint,
            appeal: null,
            countersuit: null,
          }));
          return true;
        } catch {
          return false;
        }
      },

      fileAppeal: async () => {
        if (state.caseSeq === null) return false;
        if (state.appeal) return true;
        try {
          const { appeal } = await api.fileAppeal(state.caseSeq);
          setState((s) => ({ ...s, appeal }));
          return true;
        } catch {
          return false;
        }
      },

      fileCountersuit: async () => {
        if (state.caseSeq === null) return false;
        if (state.countersuit) return true;
        try {
          const { countersuit } = await api.fileCountersuit(state.caseSeq);
          setState((s) => ({ ...s, countersuit }));
          return true;
        } catch {
          return false;
        }
      },

      createDemand: async () => {
        const input = draftToInput(state.draft);
        if (!input) return false;
        try {
          const { demand } = await api.createDemandLetter(input);
          setState((s) => ({ ...s, demand }));
          return true;
        } catch {
          return false;
        }
      },

      resetCase: () => setState(STATE_INIT),
    };
  }, [state]);

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>;
}

export function useCaseStore(): CaseStore {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCaseStore must be used within CaseProvider");
  return ctx;
}
