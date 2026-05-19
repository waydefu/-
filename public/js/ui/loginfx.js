// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════
   FLG 登入背景 — Three.js「LINK START」3D 場景（SAO 風）
   · 只用 three 核心 build/three.module.js（零裸 import，完整 URL
     動態載入必成）——不碰 examples/jsm postprocessing addon，
     徹底消滅 "Failed to resolve module specifier 'three'"，
     順帶移除手機殺手 UnrealBloom。輝光改 additive sprite/emissive。
   · 已在 CSP script-src 白名單的 cdn.jsdelivr.net；免 importmap、免改 CSP
   · 動態 import()：已登入者跳過登入畫面 → 完全不下載 Three
   · 全程防呆：WebGL 不可用 / context lost / 例外 → 回 false 收乾淨
   · 配色＝FLG 琥珀（#e8a020 / #ffcc55 / #fff0c8 / #c03010）
   · 不碰 document.body；交棒由呼叫端在 onDone 處理
   ═══════════════════════════════════════════════════════════════ */

import { getAudioLevel } from './sfx.js'; // Phase 5：音訊能量驅動核心/bloom

// three / addons 走 bare specifier，由 index.html 的 importmap 解析
// （importmap 已用 CSP sha256 hash 精準授權）。addon 內部裸 import 'three'
// 也因此可解。動態 import：已登入者跳過登入畫面 → 完全不下載 Three。

/** @type {any} */
let _fx = null;

export const isWebGLAvailable = () => {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch (_) {
    return false;
  }
};

const easeInCubic = (x) => x * x * x;
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

/**
 * 啟動登入背景 3D。
 * @param {HTMLCanvasElement} canvas
 * @param {{reduced?:boolean,onLost?:Function}} [opts]
 * @returns {Promise<boolean>} true=已啟動；false=不可用（呼叫端走 fallback）
 */
export const startLoginFx = async (canvas, opts = {}) => {
  if (!canvas || !isWebGLAvailable()) return false;
  try {
    const THREE = await import(/* @vite-ignore */ "three");
    const { EffectComposer } = await import(/* @vite-ignore */ "three/addons/postprocessing/EffectComposer.js");
    const { RenderPass } = await import(/* @vite-ignore */ "three/addons/postprocessing/RenderPass.js");
    const { UnrealBloomPass } = await import(/* @vite-ignore */ "three/addons/postprocessing/UnrealBloomPass.js");
    const { ShaderPass } = await import(/* @vite-ignore */ "three/addons/postprocessing/ShaderPass.js");
    const { AfterimagePass } = await import(/* @vite-ignore */ "three/addons/postprocessing/AfterimagePass.js");

    const reduced = !!opts.reduced;
    const intervals = new Set();
    const disposers = [];
    let raf = 0, stopped = false, warping = false;
    let flash = 0; // LINK START 白閃強度 0..1

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0065);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 4000);
    camera.position.set(0, 0, 60);

    // 真實後處理管線（取代手刻 additive 假輝光）：RenderPass + UnrealBloom
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // Bloom 只負責「暈光」，不是把畫面炸白：低 strength + 高 threshold
    // → 只有夠亮的核心/邊緣會滲光，暗部維持暗（電影感＝克制）。
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      reduced ? 0.36 : 0.48, // strength（再降：bloom 只做 halo）
      0.4,                   // radius
      0.64                   // threshold（再提高：只挑真正高亮處，不整坨泛白）
    );
    composer.addPass(bloom);
    const baseBloom = bloom.strength; // audio-reactive 以此為基準上下浮動

    // ── PHASE 4：FBO Feedback 殘影/魔法拖尾（前一幀疊加衰減）──
    // damp 越高拖尾越長；克制取 0.82。reduced-motion → 0（不留殘影＝低動態）。
    const afterimage = new AfterimagePass(reduced ? 0.0 : 0.62);
    composer.addPass(afterimage);
    disposers.push(() => {
      try { afterimage.textureComp?.dispose?.(); afterimage.textureOld?.dispose?.(); } catch (_) {}
    });

    // ── PHASE 2：全螢幕電影 shader pass（克制：暗、深，非亂閃）──
    // 色散 + 暈影 + film grain + 中心極淡暖氛圍/景深壓暗。整畫面一張 GPU shader。
    const cinePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uTime:    { value: 0 },
        uRes:     { value: new THREE.Vector2(1, 1) },
        uReduced: { value: reduced ? 1 : 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform float uTime, uReduced; uniform vec2 uRes;
        varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        void main(){
          vec2 uv = vUv;
          vec2 d = uv - 0.5;
          float r2 = dot(d, d);
          // 色散：越靠邊越分離（很輕）
          float ca = (0.0016 + r2 * 0.010);
          vec3 col;
          col.r = texture2D(tDiffuse, uv + d * ca).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - d * ca * 0.9).b;
          // 中心極淡暖氛圍（景深空氣感，不是亮光）
          float atmo = smoothstep(0.62, 0.0, length(d));
          col += vec3(0.05, 0.034, 0.012) * atmo * 0.5;
          // 暈影（暗、深、克制）
          float vig = smoothstep(0.95, 0.30, length(d) * 1.25);
          col *= mix(0.32, 1.0, vig);
          // film grain（時間變動、低量；reduced 再砍半）
          float g = hash(uv * uRes + fract(uTime) * 91.7) - 0.5;
          col += g * (uReduced > 0.5 ? 0.012 : 0.026);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    composer.addPass(cinePass);

    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight, aspect = w / h;
      camera.aspect = aspect;
      camera.position.z = aspect < 1 ? 60 + (1 - aspect) * 80
        : aspect > 1.9 ? 60 + (aspect - 1.9) * 18 : 60 - (aspect - 1) * 8;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      bloom.setSize(w, h);
      cinePass.uniforms.uRes.value.set(w, h);
    };

    // （手刻 sprite 輝光已退役：核心改 SDF Fresnel 自發光 + 真 bloom）

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const ptA = new THREE.PointLight(0xffcc55, 6, 120); ptA.position.set(10, 10, 25); scene.add(ptA);
    const ptB = new THREE.PointLight(0xe8a020, 3.5, 120); ptB.position.set(-14, -8, 18); scene.add(ptB);

    // ── 星塵（additive points）──
    {
      const N = reduced ? 900 : 2200, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - .5) * 1900;
        pos[i * 3 + 1] = (Math.random() - .5) * 1900;
        pos[i * 3 + 2] = -Math.random() * 3000 - 60;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({ color: 0xffe9b0, size: .9, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
      scene.add(new THREE.Points(g, m));
      disposers.push(() => { g.dispose(); m.dispose(); });
    }

    // ── 空氣感：中距漂浮餘燼/塵（極低透明、緩漂，給畫面「空氣」）──
    const embers = new THREE.Group();
    {
      const N = reduced ? 130 : 320, pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 170, y = (Math.random() - .5) * 280;
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = -120 - Math.random() * 900;
      }
      const g2 = new THREE.BufferGeometry();
      g2.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const m2 = new THREE.PointsMaterial({ color: 0xffcf8a, size: 1.4, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false });
      embers.add(new THREE.Points(g2, m2));
      scene.add(embers);
      disposers.push(() => { g2.dispose(); m2.dispose(); });
    }

    // ── 中央「高維封印核心」：SDF raymarch（取代多邊形鑰匙）──
    // smooth union 脈動核心 + 雙封印環 + 軌道小球（液態奧術融合），
    // Fresnel rim 自發光（不靠 bloom 硬撐），熔金底＋紅裂隙。
    // 用一張面向鏡頭的 plane 在 fragment 內 raymarch；bounded steps 控效能。
    const coreMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 }, uWarp: { value: 0 }, uAudio: { value: 0 },
        uFade: { value: 1 }, uReduced: { value: reduced ? 1 : 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime,uWarp,uAudio,uFade,uReduced; varying vec2 vUv;
        mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
        float smin(float a,float b,float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
        float sdSph(vec3 p,float r){ return length(p)-r; }
        float sdTor(vec3 p,vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
        float map(vec3 p){
          float tt=uTime*0.35;
          vec3 q=p; q.xz=rot(tt)*q.xz; q.xy=rot(tt*0.5)*q.xy;
          float pulse=0.6+0.06*sin(uTime*1.6)+uWarp*0.32+uAudio*0.2;
          float core=sdSph(p,pulse)+0.06*sin(p.x*6.+uTime*2.)*sin(p.y*6.)*sin(p.z*6.);
          float ring=sdTor(q,vec2(1.15,0.055));
          vec3 q2=p; q2.yz=rot(tt*-0.8+1.0)*q2.yz;
          float ring2=sdTor(q2,vec2(1.55,0.032));
          float d=smin(core,ring,0.35); d=smin(d,ring2,0.25);
          for(int i=0;i<3;i++){
            float a=tt*1.3+float(i)*2.094;
            d=smin(d,sdSph(p-vec3(cos(a)*1.3,sin(a*1.1)*0.5,sin(a)*1.3),0.15),0.4);
          }
          return d;
        }
        vec3 calcN(vec3 p){ vec2 e=vec2(.0016,0.); return normalize(vec3(
          map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
        void main(){
          vec2 uv=(vUv-0.5)*2.0;
          vec3 ro=vec3(uv*1.85,4.0);
          vec3 rd=normalize(vec3(uv*0.26,-1.0));
          float t=0.0; float hit=0.0; vec3 p=ro;
          int STEPS = uReduced>0.5 ? 40 : 60;
          for(int i=0;i<60;i++){
            if(i>=STEPS) break;
            p=ro+rd*t; float d=map(p);
            if(d<0.0012){ hit=1.0; break; }
            t+=d*0.85; if(t>7.0) break;
          }
          if(hit<0.5){ gl_FragColor=vec4(0.0); return; }
          vec3 n=calcN(p);
          float fres=pow(1.0-max(dot(n,-rd),0.0),3.0);
          float lp=length(p);
          vec3 base=vec3(0.10,0.055,0.02);
          float inner=smoothstep(0.55,0.0,lp);   // 內核：小而亮
          float mid=smoothstep(1.5,0.25,lp);      // 中層：能量擴散
          vec3 rim=vec3(1.0,0.72,0.30)*fres*1.5;  // Fresnel 邊＝主 glow（不靠 bloom）
          float crack=smoothstep(0.6,0.95, sin(p.x*7.+uTime*1.3)*sin(p.y*7.)*sin(p.z*7.)*0.5+0.5);
          float em=0.32+0.2*sin(uTime*1.6)+uWarp*0.5+uAudio*0.6;
          vec3 col=base+rim
            + vec3(1.0,0.62,0.20)*mid*0.26*em
            + vec3(1.0,0.80,0.46)*inner*(0.5+0.5*em)*0.7
            + vec3(0.85,0.18,0.05)*crack*0.5;
          col = col/(col+vec3(0.85));             // Reinhard tone：杜絕整坨炸白
          float a=clamp(fres*1.3+inner*0.5+crack*0.3+mid*0.12,0.0,1.0);
          gl_FragColor=vec4(col*uFade, a*uFade); // uFade：warp 尾段收暗，不衝白
        }`,
    });
    const coreGeo = new THREE.PlaneGeometry(34, 34);
    const keyGroup = new THREE.Group();           // 沿用變數名（warp/loop 不必改）
    keyGroup.add(new THREE.Mesh(coreGeo, coreMat));
    keyGroup.scale.setScalar(3.0);   // 更大更明顯（原 1.5 太小、被登入框蓋住）
    scene.add(keyGroup);
    disposers.push(() => { coreGeo.dispose(); coreMat.dispose(); });

    // ── 線環工具（additive，SAO HUD 風）──
    const lineLoop = (radius, segs, color, op, z = 0) => {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
      const l = new THREE.LineLoop(g, m); l.position.z = z;
      scene.add(l); disposers.push(() => { g.dispose(); m.dispose(); });
      return l;
    };
    // 刻度環：短線段環
    const tickRing = (radius, count, len, color, op) => {
      const pts = [];
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const major = i % 6 === 0;
        const l2 = major ? len * 2 : len;
        pts.push(Math.cos(a) * radius, Math.sin(a) * radius, 0,
                 Math.cos(a) * (radius - l2), Math.sin(a) * (radius - l2), 0);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
      const ls = new THREE.LineSegments(g, m);
      scene.add(ls); disposers.push(() => { g.dispose(); m.dispose(); });
      return ls;
    };
    // 分段弧：多段 Ring
    const segArc = (rIn, rOut, color, op, segN, gap) => {
      const grp = new THREE.Group();
      for (let k = 0; k < segN; k++) {
        const a0 = (k / segN) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2 / segN) * (1 - gap);
        const g = new THREE.RingGeometry(rIn, rOut, 48, 1, a0, a1 - a0);
        const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
        grp.add(new THREE.Mesh(g, m));
        disposers.push(() => { g.dispose(); m.dispose(); });
      }
      scene.add(grp);
      return grp;
    };

    // 半徑均勻拉開（原本 8/13/15.5/17/20.5… 太密黏成一坨）：
    // 各環之間留 ~6–8 世界單位呼吸距，外圈刻意略出框＝景深層次。
    const rings = {
      r1: lineLoop(7, 96, 0xffcc55, .5),
      r2: lineLoop(14, 110, 0xe8a020, .42),
      tick: tickRing(21, 90, 1.0, 0xffcc55, .5),
      seg1: segArc(27, 27.7, 0xe8a020, .55, 5, .35),
      seg2: segArc(34, 34.9, 0xffcc55, .4, 8, .5),
      r3: lineLoop(41, 128, 0xe8a020, .25),
      hex: lineLoop(48, 6, 0xfff0c8, .35),
      tri: lineLoop(55, 3, 0xc03010, .22),
      r4: lineLoop(62, 140, 0xe8a020, .14),
    };
    rings.hex.rotation.z = Math.PI / 6;

    // ── 資料流：放射狀隧道（遠寬→中段匯聚收束→近鏡頭外擴掠過）──
    const STREAM_N = reduced ? 1100 : 2600;            // 密度提高
    const sPos = new Float32Array(STREAM_N * 3);
    const sAng = new Float32Array(STREAM_N);            // 角度（決定放射方向）
    const sR0 = new Float32Array(STREAM_N);             // 遠端寬半徑
    const sRc = new Float32Array(STREAM_N);             // 中段收束半徑
    const sVel = new Float32Array(STREAM_N);
    const seedStream = (i, zFar) => {
      sAng[i] = Math.random() * Math.PI * 2;
      sR0[i] = 16 + Math.random() * 32;                 // 遠端散得開
      sRc[i] = 4 + Math.random() * 9;                   // 中段聚成隧道
      sVel[i] = 9 + Math.random() * 48;                 // 速度分層
      sPos[i * 3 + 2] = zFar ? -2400 - Math.random() * 1100 : -Math.random() * 3300;
    };
    for (let i = 0; i < STREAM_N; i++) seedStream(i, false);
    const streamGeo = new THREE.BufferGeometry();
    streamGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    // 圓形柔邊點貼圖：PointsMaterial 預設是方形，近鏡頭巨大方點 + afterimage
    // 會 smear 成醜方塊 → 用 radial 貼圖 + alphaTest 變柔圓點。
    const dotCv = document.createElement("canvas"); dotCv.width = dotCv.height = 64;
    {
      const g = dotCv.getContext("2d");
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.4, "rgba(255,255,255,0.5)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg; g.beginPath(); g.arc(32, 32, 32, 0, 6.2832); g.fill();
    }
    const dotTex = new THREE.CanvasTexture(dotCv);
    const streamMat = new THREE.PointsMaterial({
      color: 0xffe9b0, size: 0.95, map: dotTex, alphaTest: 0.02,
      transparent: true, opacity: .68, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const stream = new THREE.Points(streamGeo, streamMat);
    scene.add(stream);
    disposers.push(() => { streamGeo.dispose(); streamMat.dispose(); dotTex.dispose(); });

    // ── LINK START 衝擊波環池 ──
    const shock = [];
    const spawnShock = () => {
      if (stopped) return;
      const g = new THREE.RingGeometry(1, 1.25, 96);
      const m = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: .8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
      const mesh = new THREE.Mesh(g, m); scene.add(mesh);
      shock.push({ mesh, mat: m, geo: g, s: 1, max: 60, sp: 38 });
    };

    fit();
    const clock = new THREE.Clock();
    let lastT = 0, streamBoost = 1;
    const boostObj = { v: 1 }, flashObj = { v: 0 };

    const loop = () => {
      if (stopped) return;
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      let dt = t - lastT; lastT = t; if (dt > .05) dt = .05;
      const spin = reduced ? .25 : 1;
      streamBoost = boostObj.v; flash = flashObj.v;

      // SDF 核心自轉/脈動全在 shader 內（uTime）→ 不轉 group（plane 會翻到側面）
      // 上移到登入框上方（不被按鈕蓋住，像參考圖核心在按鈕上方發光）
      keyGroup.position.y = 9 + Math.sin(t * .8) * .3;
      embers.rotation.y += dt * 0.013;            // 空氣緩漂
      embers.rotation.x = Math.sin(t * 0.05) * 0.06;
      coreMat.uniforms.uTime.value = t;
      // Phase 5 audio-reactive：低頻能量 → 核心發光/脈動 + bloom 微脈
      const al = getAudioLevel();
      coreMat.uniforms.uAudio.value = al;
      bloom.strength = baseBloom + al * 0.22;

      // temporal variation：非諧波速比 + 相位錯開，破除「一起轉」的 loading 感
      rings.r1.rotation.z += dt * .23 * spin;
      rings.r2.rotation.z -= dt * .17 * spin;
      rings.tick.rotation.z += dt * .063 * spin;
      rings.seg1.rotation.z -= dt * .34 * spin;
      rings.seg2.rotation.z += dt * .19 * spin;
      rings.r3.rotation.z += dt * .041 * spin;
      rings.hex.rotation.z += dt * .11 * spin;
      rings.tri.rotation.z -= dt * .073 * spin;
      rings.r4.rotation.z -= dt * .029 * spin;
      const pulseA = .5 + Math.sin(t * 1.37 + 0.6) * .5;
      const pulseB = .5 + Math.sin(t * 0.83 + 2.1) * .5;
      rings.seg1.children.forEach((c) => c.material.opacity = .32 + pulseA * .38);
      rings.seg2.children.forEach((c) => c.material.opacity = .22 + pulseB * .3);

      // 放射隧道：遠端寬散 → 中段匯聚收束成隧道 → 近鏡頭外擴掠過。
      // 半徑隨 z 變（非固定），形成真正空間漏斗，遠慢近快（透視速度差）。
      const sp = streamGeo.attributes.position.array;
      for (let i = 0; i < STREAM_N; i++) {
        let z = sp[i * 3 + 2];
        const accel = 1 + Math.max(0, z + 1000) / 1050 * 2.6; // 越近越快
        z += sVel[i] * dt * 5 * streamBoost * accel;
        if (z > 95) { seedStream(i, true); z = sp[i * 3 + 2]; } // 掠過後遠處重生
        sp[i * 3 + 2] = z;
        // 收束 profile：far→-260 由 R0 漸聚到 Rc；-260→近鏡頭快速外擴
        let rad;
        if (z < -260) {
          const f = Math.min(Math.max((z + 1500) / 1240, 0), 1); // 0遠..1近收束點
          const e = f * f * (3 - 2 * f);                          // smoothstep
          rad = sR0[i] + (sRc[i] - sR0[i]) * e;
        } else {
          rad = sRc[i] * (1 + (z + 260) / 320 * 6.5);             // 掠過外擴
        }
        sp[i * 3] = Math.cos(sAng[i]) * rad;
        sp[i * 3 + 1] = Math.sin(sAng[i]) * rad;
      }
      streamGeo.attributes.position.needsUpdate = true;
      streamMat.opacity = .55 + Math.min(streamBoost - 1, 1) * .4;

      for (let i = shock.length - 1; i >= 0; i--) {
        const s = shock[i]; s.s += s.sp * dt; s.mesh.scale.setScalar(s.s);
        s.mat.opacity = .85 * (1 - s.s / s.max);
        if (s.s >= s.max) { scene.remove(s.mesh); s.mat.dispose(); s.geo.dispose(); shock.splice(i, 1); }
      }

      ptA.position.x = Math.sin(t * .6) * 14; ptA.position.y = Math.cos(t * .45) * 10;
      ptA.intensity = 4 + Math.sin(t * 1.5) * 1.5;

      // 暖色「連線」surge，非整屏炸白：壓低係數，bloom threshold 才不會整片泛白
      if (flash > 0.001) { scene.background = new THREE.Color(flash * 0.42, flash * 0.32, flash * 0.16); }
      else if (scene.background) scene.background = null;

      cinePass.uniforms.uTime.value = t;
      composer.render();
    };

    let rzP = false;
    const onResize = () => { if (rzP) return; rzP = true; requestAnimationFrame(() => { rzP = false; try { fit(); } catch (_) {} }); };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    const onLost = (e) => { e.preventDefault(); stopLoginFx(); opts.onLost && opts.onLost(); };
    canvas.addEventListener("webglcontextlost", onLost, false);

    // 簡易 rAF tween
    const tween = (obj, to, dur, ease, onDone) => {
      const from = {}; for (const k in to) from[k] = obj[k];
      const t0 = performance.now();
      const step = (now) => {
        if (stopped) return;
        const p = Math.min((now - t0) / dur, 1), e = ease ? ease(p) : p;
        for (const k in to) obj[k] = from[k] + (to[k] - from[k]) * e;
        if (p < 1) requestAnimationFrame(step); else onDone && onDone();
      };
      requestAnimationFrame(step);
    };

    _fx = {
      isStopped: () => stopped,
      warp(onDone) {
        const done = (() => { let f = false; return () => { if (f) return; f = true; cleanupSkip(); try { onDone && onDone(); } catch (_) {} }; })();
        if (stopped || warping) { done(); return; }
        warping = true;
        const skip = () => done();
        const onKey = (ev) => { if (ev.key === "Escape" || ev.key === "Enter") done(); };
        const cleanupSkip = () => {
          window.removeEventListener("pointerdown", skip, true);
          window.removeEventListener("keydown", onKey, true);
        };
        window.addEventListener("pointerdown", skip, true);
        window.addEventListener("keydown", onKey, true);
        const safety = setTimeout(done, 7000); intervals.add(safety);
        // LINK START：衝擊波連發 + 資料流爆衝 + 鑰匙俯衝 + 尾段白閃
        spawnShock();
        const sh1 = setTimeout(spawnShock, 220); const sh2 = setTimeout(spawnShock, 460);
        intervals.add(sh1); intervals.add(sh2);
        // afterimage 在 warp 期間降 damp：否則高亮幀累積會「瞬間炸白」
        try { afterimage.uniforms["damp"].value = reduced ? 0.0 : 0.34; } catch (_) {}
        tween(boostObj, { v: 9 }, 4200, easeInCubic);
        // 核心放大收斂（原 20 會鋪滿全螢幕＝等效白屏）
        tween(keyGroup.scale, { x: 8, y: 8, z: 8 }, 5000, easeInCubic);
        tween(coreMat.uniforms.uWarp, { value: 1 }, 4200, easeInCubic); // 核心能量增強
        tween(camera.position, { z: -160 }, 6000, easeInCubic);
        const fl = setTimeout(() => tween(flashObj, { v: 0.45 }, 600, easeInCubic), 4300);
        intervals.add(fl);
        // 尾段核心收暗（不是衝白）→ 平滑沉入 handoff
        const fd = setTimeout(() => tween(coreMat.uniforms.uFade, { value: 0.0 }, 850, easeInCubic), 4500);
        intervals.add(fd);
        setTimeout(() => { cleanupSkip(); done(); }, 5400);
      },
      cleanup() {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        intervals.forEach(clearInterval); intervals.clear();
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        canvas.removeEventListener("webglcontextlost", onLost);
        for (const s of shock) { scene.remove(s.mesh); s.mat.dispose(); s.geo.dispose(); }
        shock.length = 0;
        disposers.forEach((d) => { try { d(); } catch (_) {} });
        try { cinePass.material?.dispose?.(); } catch (_) {}
        try { composer.dispose?.(); bloom.dispose?.(); } catch (_) {}
        try { renderer.dispose(); renderer.forceContextLoss?.(); } catch (_) {}
      },
    };

    raf = requestAnimationFrame(loop);
    return true;
  } catch (err) {
    console.warn("[FLG] loginfx 啟動失敗，走 fallback:", err?.message);
    try { stopLoginFx(); } catch (_) {}
    return false;
  }
};

/** 觸發 LINK START warp，結束 onDone（idempotent、含硬安全閥、可跳過）。
 *  無 3D（已登入直入 / WebGL fallback）時立即 onDone。 */
export const warpLoginFx = (onDone) => {
  const fx = _fx;
  if (!fx || fx.isStopped()) { try { onDone && onDone(); } catch (_) {} return; }
  fx.warp(onDone);
};

/** 完整拆除（dispose 全部、清 raf/interval/listener）。idempotent。 */
export const stopLoginFx = () => {
  const fx = _fx; _fx = null;
  if (!fx) return;
  try { fx.cleanup(); } catch (e) { console.warn("[FLG] loginfx cleanup:", e?.message); }
};
