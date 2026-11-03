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
import { api, ApiError } from "@/lib/api";
import type { ModerationIssue } from "@/domain/moderation";

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
  shareToken: string | null;
  ownerToken: string | null;
  filingKind: FilingKind | null;
  verdict: Verdict | null;
  complaint: ComplaintDoc | null;
  appeal: AppealVerdict | null;
  countersuit: CountersuitDoc | null;
  demand: DemandLetterDoc | null;
}

interface CaseStore extends CaseState {
  hydrated: boolean;
  intakeIssue: ModerationIssue | null;
  /** 임시저장된 초안의 저장 시각 (없으면 null) */
  savedDraftAt: number | null;
  setStory: (story: string) => void;
  setCaseType: (caseType: CaseType) => void;
  setRelationship: (relationship: Relationship) => void;
  setSeverity: (severity: Severity) => void;
  setTone: (tone: Tone) => void;
  /** 현재 초안을 localStorage에 임시저장한다. */
  saveDraft: () => void;
  /** 임시저장된 초안을 불러온다(새 사건으로 시작). 성공 여부 반환. */
  loadDraft: () => boolean;
  /** 접수 확정: API로 사건을 생성하고 판결·고소장을 받아온다. 성공 여부 반환. */
  submitCase: (kind: FilingKind) => Promise<boolean>;
  /** 항소심 판결을 요청한다. */
  fileAppeal: () => Promise<boolean>;
  /** 혼자 변론 게임의 궤변을 받아온다. 실패하면 null. */
  loadCountersuitBrief: () => Promise<{ lines: string[]; done?: true } | null>;
  /** 피고 측 맞고소장을 요청한다. hits는 혼자 변론에서 막은 궤변 수(건너뛰면 생략). */
  fileCountersuit: (hits?: number) => Promise<boolean>;
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
  shareToken: null,
  ownerToken: null,
  filingKind: null,
  verdict: null,
  complaint: null,
  appeal: null,
  countersuit: null,
  demand: null,
};

const STATE_KEY = "lifecourt.state.v2";
const DRAFT_KEY = "lifecourt.savedDraft.v1";

interface SavedDraft {
  draft: CaseDraft;
  savedAt: number;
}

function readSavedDraft(): SavedDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedDraft;
    if (!parsed?.draft || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

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
  const [savedDraftAt, setSavedDraftAt] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [intakeIssue, setIntakeIssue] = useState<ModerationIssue | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STATE_KEY);
      if (raw) setState((prev) => ({ ...prev, ...(JSON.parse(raw) as CaseState) }));
    } catch {
      /* 손상된 저장분은 무시 */
    }
    setSavedDraftAt(readSavedDraft()?.savedAt ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const store = useMemo<CaseStore>(() => {
    const patchDraft = (patch: Partial<CaseDraft>) => {
      setIntakeIssue(null);
      setState((s) => ({ ...s, draft: { ...s.draft, ...patch } }));
    };

    return {
      ...state,
      hydrated,
      intakeIssue,
      savedDraftAt,
      setStory: (story) => patchDraft({ story }),
      setCaseType: (caseType) => patchDraft({ caseType }),
      setRelationship: (relationship) => patchDraft({ relationship }),
      setSeverity: (severity) => patchDraft({ severity }),
      setTone: (tone) => patchDraft({ tone }),

      saveDraft: () => {
        const saved: SavedDraft = { draft: state.draft, savedAt: Date.now() };
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(saved));
        setSavedDraftAt(saved.savedAt);
      },

      loadDraft: () => {
        const saved = readSavedDraft();
        if (!saved) return false;
        setState({ ...STATE_INIT, draft: { ...DRAFT_INIT, ...saved.draft } });
        return true;
      },

      submitCase: async (kind) => {
        setIntakeIssue(null);
        const input = draftToInput(state.draft);
        if (!input) return false;
        try {
          const { seq, verdict, complaint, shareToken, ownerToken } = await api.submitCase(input, kind);
          setState((s) => ({
            ...s,
            caseSeq: seq,
            shareToken,
            ownerToken,
            filingKind: kind,
            verdict,
            complaint,
            appeal: null,
            countersuit: null,
          }));
          return true;
        } catch (error) {
          if (error instanceof ApiError) setIntakeIssue(error.issue);
          return false;
        }
      },

      fileAppeal: async () => {
        if (state.caseSeq === null) return false;
        if (state.appeal) return true;
        if (!state.ownerToken) return false;
        try {
          const { appeal } = await api.fileAppeal(state.caseSeq, state.ownerToken);
          setState((s) => ({ ...s, appeal }));
          return true;
        } catch {
          return false;
        }
      },

      loadCountersuitBrief: async () => {
        if (state.caseSeq === null || !state.ownerToken) return null;
        try {
          return await api.countersuitBrief(state.caseSeq, state.ownerToken);
        } catch {
          return null;
        }
      },

      fileCountersuit: async (hits) => {
        if (state.caseSeq === null) return false;
        if (state.countersuit) return true;
        if (!state.ownerToken) return false;
        try {
          const { countersuit } = await api.fileCountersuit(state.caseSeq, state.ownerToken, hits);
          setState((s) => ({ ...s, countersuit }));
          return true;
        } catch {
          return false;
        }
      },

      createDemand: async () => {
        setIntakeIssue(null);
        const input = draftToInput(state.draft);
        if (!input) return false;
        try {
          const { demand } = await api.createDemandLetter(input);
          setState((s) => ({ ...s, demand }));
          return true;
        } catch (error) {
          if (error instanceof ApiError) setIntakeIssue(error.issue);
          return false;
        }
      },

      resetCase: () => { setIntakeIssue(null); setState(STATE_INIT); },
    };
  }, [state, savedDraftAt, hydrated, intakeIssue]);

  return <CaseContext.Provider value={store}>{children}</CaseContext.Provider>;
}

export function useCaseStore(): CaseStore {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCaseStore must be used within CaseProvider");
  return ctx;
}
