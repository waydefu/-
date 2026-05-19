export const MAX_DRAFT_CHARS = 1800;

export type DraftValidationResult =
  | { ok: true; draft: string }
  | { ok: false; code: "missing-text" | "draft-too-long" | "invalid-format"; message: string };

// Prompt injection guard for structural system markers only. Normal dialogue can
// contain phrases like "ignore previous orders", so broad natural-language
// blocking would create false positives for fiction drafts.
export function looksLikeInjection(text: string): boolean {
  const patterns = [
    /\[\s*system\s*\]/i,
    /\[\s*系統\s*\]/,
    /<<\s*sys\s*>>/i,
    /<\|\s*(?:im_start|im_end|system|endoftext)\s*\|>/i,
    /```\s*system/i,
    /(?:^|\n)\s*system\s*[:：]/i,
    /(?:^|\n)\s*系統\s*(?:提示|指令)\s*[:：]/,
  ];
  return patterns.some((p) => p.test(text));
}

export function validateDraftInput(input: unknown): DraftValidationResult {
  if (typeof input !== "string" || !input.trim()) {
    return {
      ok: false,
      code: "missing-text",
      message: "請先輸入要審查的草稿。",
    };
  }

  if (input.length > MAX_DRAFT_CHARS) {
    return {
      ok: false,
      code: "draft-too-long",
      message: `單段審查上限 ${MAX_DRAFT_CHARS} 字，請縮短或分段送審（目前 ${input.length} 字）。`,
    };
  }

  if (looksLikeInjection(input)) {
    return {
      ok: false,
      code: "invalid-format",
      message: "草稿格式含有系統提示標記，請移除後再試。",
    };
  }

  return { ok: true, draft: input };
}
