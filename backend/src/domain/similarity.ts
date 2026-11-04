import { NOT_A_COMPLAINT_EXAMPLES, SCENARIO_EXAMPLES } from "./scenario-examples";

/**
 * 예시 사연과의 유사도로 사건을 고른다(docs/plan-accuracy.md 3단계).
 * 사연을 글자 2~3개 조각으로 나눠 TF-IDF 가중치를 매기고, 코사인 유사도가 가장 높은 예시 15개가
 * 사건별로 표를 던진다. 외부 서비스 없이 계산만 하므로 같은 사연은 늘 같은 결과가 나온다.
 */

/** 기준값은 개발용 시험지로 정하고 새 봉인 시험지로 한 번 확인했다(docs/plan-accuracy.md). 바꾸면 다시 잰다. */
const NEIGHBORS = 15;
const MIN_SIMILARITY = 0.13;
const MIN_VOTE_MARGIN = 0.2;
/** 사건을 고르려면 이웃 표 중 이만큼은 그 사건 몫이어야 한다(예시를 15개로 늘린 뒤 0.2 → 0.4). */
export const MIN_SCENARIO_SHARE = 0.4;
/** 이웃 표의 이만큼이 '고소할 일이 아닌 문장'이면 키워드가 맞아도 일반 분쟁으로 둔다. */
export const NOT_A_COMPLAINT_SHARE = 0.7;
/** 키워드 점수가 이 이상이면 예시 유사도가 사건을 바꾸지 못한다. 분명한 고소 사연을 지킨다. */
export const KEYWORD_PROTECT_SCORE = 5;

type Vector = Map<string, number>;
interface Example { label: string | null; vector: Vector }

let index: { examples: Example[]; idf: (gram: string) => number } | null = null;

function grams(text: string): string[] {
  const s = text.normalize("NFKC").toLowerCase().replace(/[^0-9a-z가-힣ㄱ-ㅎ]/g, "");
  const out: string[] = [];
  for (const n of [2, 3]) for (let i = 0; i + n <= s.length; i++) out.push(s.slice(i, i + n));
  return out;
}

function vectorize(text: string, idf: (gram: string) => number): Vector {
  const v: Vector = new Map();
  for (const g of grams(text)) v.set(g, (v.get(g) ?? 0) + idf(g));
  let norm = 0;
  for (const x of v.values()) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (const [k, x] of v) v.set(k, x / norm);
  return v;
}

function cosine(a: Vector, b: Vector): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, x] of small) {
    const y = large.get(k);
    if (y) dot += x * y;
  }
  return dot;
}

/** 서버가 처음 사연을 받을 때 한 번만 만든다. */
function getIndex() {
  if (index) return index;
  const raw: { label: string | null; text: string }[] = [
    ...SCENARIO_EXAMPLES.flatMap(([label, texts]) => texts.map((text) => ({ label, text }))),
    ...NOT_A_COMPLAINT_EXAMPLES.map((text) => ({ label: null, text })),
  ];
  const df = new Map<string, number>();
  for (const { text } of raw) for (const g of new Set(grams(text))) df.set(g, (df.get(g) ?? 0) + 1);
  const n = raw.length;
  const idf = (g: string) => Math.log((n + 1) / ((df.get(g) ?? 0) + 1)) + 1;
  index = { idf, examples: raw.map(({ label, text }) => ({ label, vector: vectorize(text, idf) })) };
  return index;
}

export interface SimilarityVote {
  /** 사건 이름. null이면 '고소할 일이 아닌 문장'에 가장 가깝다. */
  label: string | null;
  score: number;
  /** 전체 표 중 이 후보의 몫(0~1). */
  share: number;
}

export interface SimilarityResult {
  /** 득표 순 후보. */
  ranked: readonly SimilarityVote[];
  /** 1등이 기준을 넘어 믿을 만한지. */
  confident: boolean;
  /** 가장 비슷한 예시의 유사도가 기준 이상인지. */
  similarEnough: boolean;
  /** '고소할 일이 아닌 문장' 표의 몫. */
  notAComplaintShare: number;
  /** 가장 비슷한 예시의 유사도(0~1). */
  best: number;
  /** 1등과 2등의 표 차이. */
  margin: number;
}

export function similarScenarios(story: string): SimilarityResult {
  const { examples, idf } = getIndex();
  const q = vectorize(story, idf);
  const nearest = examples
    .map((ex) => ({ label: ex.label, c: cosine(q, ex.vector) }))
    .sort((a, b) => b.c - a.c)
    .slice(0, NEIGHBORS);
  const votes = new Map<string | null, number>();
  for (const { label, c } of nearest) votes.set(label, (votes.get(label) ?? 0) + c);
  const total = [...votes.values()].reduce((sum, v) => sum + v, 0) || 1;
  const ranked = [...votes.entries()].map(([label, score]) => ({ label, score, share: score / total })).sort((a, b) => b.score - a.score);
  const best = nearest[0]?.c ?? 0;
  const margin = (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0);
  return {
    ranked,
    confident: best >= MIN_SIMILARITY && margin >= MIN_VOTE_MARGIN,
    similarEnough: best >= MIN_SIMILARITY,
    notAComplaintShare: ranked.find((vote) => vote.label === null)?.share ?? 0,
    best,
    margin,
  };
}
