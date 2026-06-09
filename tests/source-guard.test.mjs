import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("frontend source guardrails", () => {
  it("keeps the boot loader coordinated with VFX readiness and fallback", () => {
    const main = readFileSync("public/js/main.js", "utf8");
    const effects = readFileSync("public/js/effects/effects-manager.js", "utf8");
    const core = readFileSync("public/js/effects/great-sage-core.js", "utf8");

    assert.match(main, /BOOT_MIN_MS\s*=\s*3200/);
    assert.match(main, /BOOT_MAX_MS\s*=\s*6000/);
    assert.match(main, /worldforge:vfx-ready/);
    assert.match(main, /worldforge:vfx-fallback/);
    assert.match(main, /worldforge:vfx-full/);

    assert.match(effects, /worldforge:vfx-\$\{state\}/);
    assert.match(effects, /vfx-loading/);
    assert.match(effects, /vfx-fallback/);
    assert.match(effects, /context lost/);

    assert.match(core, /worldforge:vfx-full/);
    assert.match(core, /_markDetailLoaded\("bloom"\)/);
    assert.match(core, /_markDetailLoaded\("magicule"\)/);
  });
});
