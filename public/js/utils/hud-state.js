// @ts-check

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const appCheckRatio = {
  valid: 1,
  "token-ready": 1,
  "token-ready-refresh": 1,
  activated: 0.7,
  "local-disabled": 0.6,
  missing: 0.4,
  disabled: 0.3,
  "sdk-missing": 0.3,
  invalid: 0.2,
  "token-error": 0.2,
  "token-refresh-error": 0.2,
  "init-error": 0.1,
};

function upperStatus(status) {
  return String(status || "unknown").replace(/-/g, "_").toUpperCase();
}

export function buildHudState({
  draftText = "",
  forbiddenHits = 0,
  appCheckStatus = "",
  quota = null,
  analyzing = false,
} = {}) {
  const draftLength = String(draftText || "").length;
  const draftRatio = clamp(draftLength / 1800);
  const hitCount = Math.max(0, Number(forbiddenHits) || 0);
  const integrityRatio = clamp(1 - hitCount / 10);
  const barrierRatio = appCheckRatio[String(appCheckStatus || "").toLowerCase()] ?? 0.3;
  const quotaLimit = Number(quota?.limit) || 0;
  const quotaRemaining = Number(quota?.remaining) || 0;
  const flowRatio = quotaLimit > 0 ? clamp(quotaRemaining / quotaLimit) : 0;

  return {
    meters: [draftRatio, integrityRatio, barrierRatio, flowRatio],
    readouts: {
      parallel: `${Math.round(draftRatio * 100)}%`,
      integrity: hitCount === 0 ? "CLEAN" : `${hitCount} HITS`,
      barrier: upperStatus(appCheckStatus),
      flow: quotaLimit > 0 ? `${Math.max(0, quotaRemaining)}/${quotaLimit}` : "—",
      quotaResetAt: quota?.resetAt || "",
      analyzing: analyzing ? "ANALYZING" : "STANDBY",
      draftLength: `${draftLength}/1800`,
    },
    analyzing: !!analyzing,
  };
}

export const emptyHudState = buildHudState();
