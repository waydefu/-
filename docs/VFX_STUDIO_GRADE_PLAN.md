# 大賢者 VFX — 工作室級魔法陣升級設計書

> 文件目的：context 爆掉也能照此接續。讀順序：`README.md` → 本檔 → `git status --short`。
> 版本 v1.0 ／ 2026-06-10 ／ 狀態：P0+P1 實作中

---

## 0. 一句話定錨（最重要，別再走錯）

目標：**在現有「立體分層金色魔法陣」底子上，往上疊工作室級(Awwwards/Active Theory 那種)的 richness 層**，讓視覺華麗度**明顯超過**目前線上版。

**禁區教訓**：先前做過一支「扁平程序化 SDF 線稿」PoC（`poc/great-sage-vfx-poc.html`），技術乾淨但**華麗度倒退**（比現有還空）。**不要再走扁平極簡路線**。華麗 = 立體 + 密集 + 氛圍 + 電影後製，不是乾淨線條。

---

## 1. 現況基準（要被輾壓的對象）

- 線上正式 VFX = `public/js/effects/great-sage-core.js`（master 已回退到 `2ffba90` 的 fuller-ring 完整環版）：Three.js + 自寫 alpha-safe UnrealBloom + ACES，立體傾斜金色軌道環 + 核心 + magicule shader 粒子 + 計算環。
- 這版「立體分層 + 金藍漸層 + 餘燼粒子」已經不錯 → 新設計要**超過它**，不是回到它以下。

---

## 2. Richness 倍增器（按視覺衝擊排序，皆有權威背書、皆免 build）

| 倍增器 | 做什麼 | 權威來源 |
|---|---|---|
| **① GPGPU 粒子場** | 數萬粒子用 FBO 在 GPU 算位置，沿 curl-noise 場線在 3D 環繞核心流動。密度與生命感的最大來源。用 `GPUComputationRenderer`(three addon) | three GPGPU 範例、juniorxsound/Particle-Curl-Noise、iagokrt/curl-noise-threejs |
| **② 電影後製堆疊** | 微色散(chromatic aberration) + 底片顆粒(grain) + 暈影 + 色彩分級(LUT/曲線) + bloom；後續再加真景深 DOF | Matt DesLauriers “Filmic Effects for WebGL”、pmndrs/postprocessing |
| **③ 體積氛圍** | 深度霧 + 核心射出 god-ray 光束(儀式/登入成功) | Maxime Heckel 體積光/raymarching |
| **④ SDF 細節疊在 3D 環上** | 環的符文/刻度用 SDF 著色器畫 → 又立體又無限銳利(取 PoC 的精華當細節，非取代立體) | Inigo Quilez 2D SDF |
| **⑤ 體積核升級** | 中央核心 raymarch 體積感 | Heckel cloudscapes |
| **⑥ GSAP 編舞** | 視差鏡頭飄移、能量狀態衝擊(idle/login/handoff/analyzing) | — |

---

## 3. 分階段 + 完成後「輾壓舊版」% 評估（投影值，吃執行品質）

> 基準：現有 fuller-ring 立體環版 = 100% 華麗度。以下為**累積**投影。

| 階段 | 內容 | 單階段華麗增幅 | 累積 vs 現有 |
|---|---|---|---|
| **P0** | GPGPU curl 粒子場（+ 立體環基底） | +30~40% | **+35%** |
| **P1** | 電影後製（bloom 校準 + 微色散 + 顆粒 + 暈影 + 色分級 + 偽焦點柔化） | +20~30% | **+55~65%** |
| **P2** | 體積霧/god-ray + 環上 SDF 符文細節 + 體積核 | +20~30% | **+80~95%** |
| **P3** | GSAP 編舞 + 效能分級 | +10~15% | **+95~110%** |

**結論投影**：做完 **P0+P1 ≈ 比現有華麗 +55~65%**（達標「輾壓」門檻）；全做完 **≈ +90~110%**（接近翻倍）。
**誠實邊界**：以上是技法天花板，需執行到位才拿得到；驗收方式＝把 lab 頁擺現有版旁邊**肉眼比 + 截圖**。

---

## 4. 硬規則（沿用專案鐵律 + 本輪使用者指示）

- **免 build**：純 Three.js(jsdelivr `/+esm`/importmap) + 自刻 ShaderPass，不引入打包、不動 CSP、不加 npm 依賴（後製手刻，GPGPU 用 three 內建 addon）。
- **手機先不降級**（使用者指示 2026-06-10）：DPR 與粒子數**先全開**，不預先為手機砍；若手機效能撐不住，**回報使用者再決定**，不自作主張降級。唯一既有效能旋鈕仍是 DPR/render-scale。
- dispose：所有 FBO/RT/geometry/material/texture 在 dispose、visibility hidden、context lost 時釋放。
- WebGL 失敗 / context lost → 退回 CSS 電影背景，不黑屏。
- 背景層不擋內容；登入頁不加遮罩、不壓暗。

---

## 5. 檔案與進度

- **設計書**：本檔 `docs/VFX_STUDIO_GRADE_PLAN.md`
- **PoC v2（P0+P1 實驗，部署於 hosting 供手機預覽）**：`public/vfx-lab.html`（獨立頁，不動正式 `index.html`）
- 舊扁平 PoC（廢棄參考）：`poc/great-sage-vfx-poc.html`
- 正式 VFX（最終移植目標）：`public/js/effects/great-sage-core.js`
- Codex 未審定的邊緣 rune 環 +186：分支 `wip/codex-balanced-rune-ring`

### 遷移路徑
PoC v2(`vfx-lab.html`) 驗收「輾壓現有」後，才把 P0/P1/P2 技法整合進 `great-sage-core.js`（保留 constructor/update/dispose 契約），逐階段部署。

---

## 6. 接續指引（context 爆掉時）

1. 讀 `README.md` + 本檔。
2. `git status --short` 看現況。
3. PoC v2 在 `public/vfx-lab.html`，線上 `/vfx-lab.html` 可開（含手機）。
4. 目前進度見下方「進度日誌」。

## 進度日誌
- 2026-06-10：建立設計書。P0（GPGPU curl 粒子）+ P1（電影後製）於 `poc/vfx-lab.html`（已移出 public，純本機）。手機不降級。
- 2026-06-11：依使用者新參考（《轉生史萊姆》大賢者技能 UI）重做為 v3「資料魔法陣」：煙霧+散落資料方塊+god-ray+三式不同環(符文字/資料條/刻度)+體積核(P2 已起步)+青藍資料色。修：顆粒改無 sin 雜湊(根治斜線)、Bloom 減弱、移除六芒星。
  美術參考要點：背景密集資料方塊碎片、放射光柱、爆亮核心、多種不同環、條碼/讀數標記；色彩=金/橙主 + 青藍綠資料 accent + 爆白核 +（能量帶紅）。**極密極繁為目標**。
- 2026-06-11(2)：使用者交付完整 17 章美術規格 →「SAGE CORE IGNITION」（存於 `docs/SAGE_CORE_IGNITION_SPEC.md`，**此後 VFX 唯一美術聖經，優先於本檔 §2-§3**）。
  v5 已實作於 `poc/vfx-lab.html`（預覽、不降級、未部署）：規格 一~九 全分層（暗角混色底/羊皮紙霧/暗綠資料霧/粉塵/失焦光斑/破碎外圓+外刻度碎片/青綠結界帶/資料短條+斜切片/主法陣 9 模組分區+雙微刻度環+八方校準+節點光珠/三層符文環內→外點亮+掃描/白金封印環+四向節點依序+保護罩/raymarch 體積核+波動層+外焰+星芒/前後景放射線+資料連接線+移動光點）+ GPGPU 三族粒子（吸入/爆散/遠塵+近景 bokeh）+ 五階段狀態機（休眠/點火/演算/完成/失敗，DOM 控制鈕+模組狀態條+原創標記字環）。
  下一步：使用者驗收 v5 → 調參 → 通過後依規格 §15 做手機降級 → 整合進 great-sage-core.js。

---

## 7. 為什麼之前像 tech demo（根因）+ 怎麼避免再發生（鐵律）

**根因**：手刻最小 SDF 圖元（裸線、刻度、方塊）+ 盲調數字 → 本質是 tech demo，不是 AAA。AAA 魔法陣是「**多層堆疊，每層用對的技法做到密**」，不是幾個原始圖元。

**鐵律（以後一律照做）**：
1. **研究先行、多來源**：先定美術 + 找對技法（iq + Book of Shaders + 多來源），再寫一行 shader。
2. **對著具體參考做**，量化比對，不憑感覺。
3. **分層堆疊密度**：氛圍 / 符文 / 體積核 / 粒子 / 後製，缺一層就不夠。
4. **每元素用對的技法且做到密**：**禁止裸線、裸刻度、裸方塊**單獨出現。
5. **出手前自評 AAA gate**：「哪個元素還很業餘？」答得出就先修。

## 8. 技術逐項拆解（多來源 + iquilezles.org 為骨架）

| 元素 | 技法 | 權威來源（多） |
|---|---|---|
| 氛圍／煙霧／能量場 | Noise → FBM → **Domain Warping**（讓雜訊有結構，非糊） | iq fbm／warp、Book of Shaders 11/12/13、Moonjump |
| 符文／法陣線條 | **2D SDF 全套**（arc/polygon/star/rounded + **smin 融合** + glow），非單線 | iq distfunctions2d／smin、inspirnathan glow、GM Shaders SDF tricks、jvns |
| 程序紋理／有機細節 | **Voronoi/Worley** 細胞、能量胞 | iq voronoise/smoothvoronoi、Book of Shaders cellular |
| 體積核／光暈／god-ray | **Raymarching 3D** 體積 + Beer's law + numerical normals | iq raymarchingdf／normalsSDF、Maxime Heckel、GM Shaders volumetric、electricsquare workshop |
| 魔力粒子 | GPGPU FBO + curl noise | Heckel 粒子、three GPGPU |
| 後製 | bloom + DOF + grain + filmic grade | Matt DesLauriers、pmndrs/postprocessing |
| 「Magic Circle」動法 | Rotate／Dilate／Translate 疊代分形 | Shadertoy Magic Circle (MlGGDt) |
| 可重用函式庫 | LYGIA generative GLSL | LYGIA |

### 目標美術語言（兩參考）
- **Slime 大賢者**：分析鑑定 UI＝資料球體 + 放射光 + 漂浮資料碎片 + 全息讀數 + 青藍綠資料色 + 金，**密**。
- **SAO UI**：冷青藍半透明全息視窗、銳利幾何面板、LINK START 彩虹隧道、掃描線、monospace、發光邊。
- **本專案＝黑金魔法書** → 融合：SAO 全息冷藍 chrome + Slime 金色資料魔導核。
