(() => {
  const state = JSON.parse(sessionStorage.getItem("lifecourt.state.v2") || "null");
  const docs = [...document.querySelectorAll(".vdoc")];
  return {
    path: location.pathname.startsWith("/s/") ? "/s/[redacted]" : location.pathname,
    viewport: [innerWidth, innerHeight],
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    hasOwnerCredential: !!state?.ownerToken,
    hasShareCredential: !!state?.shareToken,
    callouts: [...document.querySelectorAll("svg[role=img]")].map(el => el.getAttribute("aria-label")),
    documents: docs.length,
    documentContainsEnglishEffect: docs.some(doc => /Objection!|Overruled!|Sustained!|Case dismissed!/.test(doc.textContent)),
    appealOverturned: state?.appeal?.overturned ?? null,
    countersuitAccepted: state?.countersuit?.accepted ?? null,
    defenseButtons: document.querySelectorAll(".resp-opt").length,
    defenseDocument: !!document.querySelector(".resp-doc"),
  };
})()
