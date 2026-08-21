/** 접수 절차 진행 표시 — 금장 족자 매듭. current는 1부터 시작. */
export function Steps({ current, total = 5 }: { current: number; total?: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const cls = n < current ? "knot on" : n === current ? "knot cur" : "knot";
        return (
          <span key={n} style={{ display: "contents" }}>
            <span className={cls} />
            {n < total && <span className="tie" />}
          </span>
        );
      })}
    </div>
  );
}
