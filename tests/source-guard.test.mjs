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

  it("keeps the Great Sage core as a magic-circle rune core", () => {
    const core = readFileSync("public/js/effects/great-sage-core.js", "utf8");
    const computation = readFileSync("public/js/webgl/raphael-computation-ring.js", "utf8");

    assert.doesNotMatch(core, /orbitDefs/);
    assert.doesNotMatch(core, /this\.orbits/);
    assert.doesNotMatch(core, /shellGeo|shellMat|this\.shell/);
    assert.doesNotMatch(core, /makeGlowRingTexture/);
    assert.doesNotMatch(computation, /18\.5|18\.6|23\.7|OPTICAL_TEAL|RAPHAEL_CYAN,/);
    assert.doesNotMatch(computation, /rotation\.set\(/);

    assert.match(core, /SphereGeometry/);
    assert.match(core, /makeCoreSigilTexture/);
    assert.match(core, /computeFrameProfile/);
    assert.match(core, /coreSigils/);
    assert.match(computation, /Raphael Compact Rune Ring/);
  });
});
