// @ts-nocheck
// SAGE CORE IGNITION — 共用 VFX 工廠（唯一真源；poc/vfx-lab.html 與 great-sage-core.js 共用）
// 規格：docs/SAGE_CORE_IGNITION_SPEC.md + docs/SAGE_CORE_REFINE_PASS2.md
// 零依賴：所有 three 類別由呼叫端注入（lab 用 CDN importmap、主站用動態 import）。

export const QUALITY = {
  ultra:  { dprCap: 2.0, texW: 200, steps: 24 },
  high:   { dprCap: 1.5, texW: 160, steps: 18 },
  medium: { dprCap: 1.25, texW: 128, steps: 12 },
  low:    { dprCap: 1.0, texW: 96,  steps: 8 },
  static: { dprCap: 1.0, texW: 64,  steps: 0 },
};

const BG_FRAG = `
precision highp float;
uniform float uTime,uRT,uPower,uIgnite,uFail,uFlash,uComplete,uPulse,uSteps;
uniform vec2 uRes;
#define TAU 6.28318530718
mat2 rot(float a){ float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
float h11(float n){ return fract(sin(n)*43758.5453); }
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y); }
float fbm2(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*vn2(p); p=rot(0.5)*p*2.02; a*=.5;} return v; }
float vn3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  float n=dot(i,vec3(1.,57.,113.));
  return mix(mix(mix(h11(n),h11(n+1.),f.x),mix(h11(n+57.),h11(n+58.),f.x),f.y),
             mix(mix(h11(n+113.),h11(n+114.),f.x),mix(h11(n+170.),h11(n+171.),f.x),f.y),f.z); }
float fbm3(vec3 p){ float v=0.,a=.5; for(int i=0;i<3;i++){ v+=a*vn3(p); p*=2.03; a*=.5;} return v; }
float sdSeg(vec2 p,vec2 a,vec2 b){ vec2 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float smin(float a,float b,float k){ float h=clamp(0.5+0.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
float glow(float d,float w){ return (w*w)/(d*d+w*w); }
// ── 符文 5 家族：0線 1點陣 2弧 3三角 4矩形鎖扣（REFINE_PASS2 §4）──
float glyphFam(vec2 g,float seed,float fam){
  float d=1e9;
  if(fam<0.5){ for(int s=0;s<3;s++){ float fs=float(s);
      if(s==0||h11(seed+fs*7.3)>0.35){
        float xx=(floor(h11(seed+fs*3.7)*2.999)-1.0)*0.5;
        float vert=step(0.4,h11(seed+fs*4.1));
        vec2 a=mix(vec2(-0.85,xx),vec2(xx,-0.85),vert);
        vec2 b=mix(vec2( 0.85,xx),vec2(xx, 0.85),vert);
        d=smin(d,sdSeg(g,a,b),0.10); } } }
  else if(fam<1.5){ for(int s=0;s<5;s++){ float fs=float(s);
      if(h11(seed+fs*5.9)>0.30){
        vec2 c=vec2(floor(h11(seed+fs*3.3)*2.999)-1.0,floor(h11(seed+fs*6.7)*2.999)-1.0)*0.55;
        d=min(d,length(g-c)-0.14); } } }
  else if(fam<2.5){ vec2 c=vec2((h11(seed+2.0)-0.5)*0.5,(h11(seed+3.0)-0.5)*0.5);
    d=abs(length(g-c)-(0.45+0.25*h11(seed+4.0)));
    if(h11(seed+5.0)>0.4){ float xx=(h11(seed+6.0)-0.5)*0.8; d=smin(d,sdSeg(g,vec2(xx,-0.7),vec2(xx,0.7)),0.12);} }
  else if(fam<3.5){ vec2 p0=vec2(0.0,0.75),p1=vec2(-0.65,-0.55),p2=vec2(0.65,-0.55);
    float r3=h11(seed+7.0);
    d=min(sdSeg(g,p0,p1),sdSeg(g,p1,p2));
    if(r3>0.35) d=min(d,sdSeg(g,p2,p0));
    if(r3>0.7) d=smin(d,length(g)-0.12,0.1); }
  else { vec2 b=abs(g)-vec2(0.55,0.45);
    d=abs(length(max(b,vec2(0.0)))+min(max(b.x,b.y),0.0));
    d=smin(d,sdSeg(g,vec2(-0.2,0.0),vec2(0.2,0.0)),0.08); }
  return d;
}
// 符文環：famSel<0 隨機家族；亮度層級 80/15/5；uFail 局部熄滅
float runeRingT(vec2 p,float r,float count,float seed,float hw,float famSel,float F){
  float rr=length(p); if(abs(rr-r)>hw) return 0.0;
  float a2=atan(p.y,p.x); if(a2<0.0)a2+=TAU;
  float cf=a2/TAU*count; float cell=floor(cf);
  float fam=famSel<0.0?floor(h11(cell*3.1+seed)*4.999):famSel;
  vec2 g=vec2((fract(cf)-0.5)*(TAU*r/count), rr-r)/(hw*0.80);
  float tier=h11(cell*1.7+seed+50.0);
  float amp=tier<0.80?0.40:(tier<0.95?0.85:1.45);
  if(F>0.0&&h11(cell+99.0+seed)>0.55) amp*=max(0.0,1.0-F*1.2);
  return glow(glyphFam(g,cell*1.618+seed,fam),0.11)*amp;
}
float tickRing(vec2 pr,float r0,float N,float wA,float lenR,float seed){
  float rr=length(pr); if(abs(rr-r0)>lenR*1.8) return 0.0;
  float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
  float cf=a2/TAU*N; float cell=floor(cf);
  float dens=0.35+0.65*fbm2(vec2(a2*1.7,seed));
  if(h11(cell+seed)>dens) return 0.0;
  float fx=abs(fract(cf)-0.5)*(TAU*r0/N);
  float L=lenR*(0.45+0.85*h11(cell+seed*1.71));
  return smoothstep(wA,wA*0.3,fx)*smoothstep(L,L*0.4,abs(rr-r0));
}
float nodes(vec2 p,float r,float N,float phase){
  float a2=atan(p.y,p.x);
  float na=floor((a2+phase)/TAU*N+0.5)/N*TAU-phase;
  vec2 c=vec2(cos(na),sin(na))*r;
  float dl=length(p-c);
  return glow(min(abs(dl-0.016),dl-0.005),0.0046);
}
float latchAt(vec2 p,vec2 c,float aRot,float s){
  vec2 q=rot(aRot)*(p-c);
  if(dot(q,q)>s*s*9.0) return 0.0;
  float d=length(q)-s*0.20;
  d=min(d,sdSeg(q,vec2(-s*1.1,0.0),vec2(-s*0.45,0.0)));
  vec2 b=abs(q-vec2(s*0.55,0.0))-vec2(s*0.40,s*0.30);
  d=min(d,abs(length(max(b,vec2(0.0)))+min(max(b.x,b.y),0.0)));
  return glow(d,0.0032);
}
float arcFrags(vec2 p,float seed){
  float a2=atan(p.y,p.x); if(a2<0.0)a2+=TAU; float rr=length(p); float acc=0.0;
  for(int i=0;i<6;i++){ float fi=float(i);
    float r=0.56+0.20*h11(fi+seed);
    float s=h11(fi*3.1+seed)*TAU; float sp=0.4+1.2*h11(fi*5.7+seed);
    float da=mod(a2-s+TAU,TAU);
    float win=step(da,sp)*smoothstep(0.0,0.12,da)*smoothstep(sp,sp-0.12,da);
    acc+=glow(abs(rr-r),0.0016)*win; }
  return acc;
}
float raysLayer(float ang,float rad,float seed,float sharp){
  float acc=0.0;
  for(int i=0;i<10;i++){ float fi=float(i);
    float a0=(fi/10.0)*TAU+(h11(fi+seed)-0.5)*0.5+uRT*0.012;
    float d=abs(mod(ang-a0+3.14159,TAU)-3.14159);
    float w=exp(-d*d*sharp*(0.6+0.8*h11(fi+seed*2.0)));
    float reach=0.55+0.6*h11(fi+seed*3.0);
    float m=smoothstep(0.16,0.30,rad)*smoothstep(reach,reach*0.45,rad);
    acc+=w*m*mix(1.0,step(0.22,fract(rad*7.0+h11(fi+seed*4.0)*7.0)),0.55); }
  return acc;
}
void main(){
  vec2 uv=(gl_FragCoord.xy*2.0-uRes)/uRes.y;
  float t=uTime,RT=uRT,P=uPower,I=uIgnite,F=uFail,FL=uFlash,C=uComplete,pulse=uPulse;
  float rad=length(uv); float ang=atan(uv.y,uv.x+1e-6);
  vec3 gold=vec3(1.0,0.78,0.38),amber=vec3(1.0,0.62,0.22),plat=vec3(1.0,0.97,0.90),
       teal=vec3(0.30,0.82,0.74),emberR=vec3(1.0,0.30,0.12);
  // 階段門（點火 內→外）
  float sealGate=smoothstep(0.02,0.20,I);
  float midGate=smoothstep(0.30,0.60,I);
  float outerGate=smoothstep(0.60,0.85,I);
  float boundaryGate=smoothstep(0.80,1.0,I);
  float mainAmp=mix(0.12,1.0,P)*midGate;
  float outerAmp=mix(0.09,1.0,P)*outerGate;
  float tealAmp=mix(0.10,0.65,P)*boundaryGate;
  float computing=smoothstep(0.55,0.80,P);
  float cp=0.5+0.5*sin(t*(0.8+2.2*P));
  float coreAmp=mix(0.20,1.0,P)*(0.85+0.30*cp)+FL*0.9+pulse*0.6;
  vec3 coreTint=mix(vec3(1.0),emberR,F*0.8);

  // ═ 一 Void Manuscript Space
  float edge=smoothstep(0.55,1.75,rad);
  vec3 edgeCol=mix(vec3(0.026,0.020,0.011),mix(vec3(0.010,0.020,0.016),vec3(0.009,0.012,0.022),0.5+0.5*sin(ang*2.0+1.0)),0.6);
  vec3 col=mix(vec3(0.016,0.013,0.009),edgeCol,edge);
  col+=vec3(0.0035)*hash21(uv*917.3+floor(t*1.5));
  float dust=hash21(floor(uv*110.0)+floor(t*1.1)*0.37);
  col+=vec3(0.020,0.017,0.012)*step(0.997,dust);                       // 魔力粉塵（收斂，避免星空）
  col*=1.0-0.16*step(0.9965,hash21(floor(uv*64.0)+7.7))*edge;          // 墨跡灰塵（暗點）
  vec2 q=uv*1.1;
  vec2 w1=vec2(fbm2(q+RT*0.020),fbm2(q+vec2(5.2,1.3)-RT*0.016));
  float fog=fbm2(q+2.6*w1);
  float fogW=smoothstep(0.1,-1.0,uv.y)*0.7+smoothstep(0.45,1.25,abs(uv.x))*0.5;
  col+=vec3(0.30,0.19,0.09)*fog*fog*fogW*0.16;                          // 羊皮紙霧
  float smokeMid=fbm2(q*1.8+w1*1.5-vec2(RT*0.01,0.0))*smoothstep(0.55,0.95,rad)*smoothstep(1.45,1.1,rad);
  col+=vec3(0.28,0.18,0.06)*smokeMid*0.22;                              // 暗金資料煙
  float tFog=fbm2(q*1.4-w1+vec2(0.0,RT*0.012));
  col+=teal*0.045*tFog*tFog*smoothstep(0.7,1.4,rad);                    // 青綠索引霧
  { vec2 tp=rot(0.02*sin(RT*0.05))*uv;                                  // 漂浮文字殘影（不可讀）
    for(int r=0;r<3;r++){ float fr=float(r);
      float y0=-0.62+fr*0.55+0.04*sin(RT*0.1+fr*2.0);
      float dy=abs(tp.y-y0);
      if(dy<0.035){
        float cx=floor((tp.x+RT*0.012*(fr-1.0))*22.0);
        float on=step(0.35,h11(cx+fr*57.0));
        col+=vec3(0.45,0.38,0.26)*0.030*on*smoothstep(0.030,0.010,dy)
             *step(fract((tp.x)*22.0),0.7)*smoothstep(0.40,0.75,rad); } } }
  { vec2 gp=uv*9.0+vec2(0.0,t*0.05); vec2 cell=floor(gp);               // 燒焦紙屑（暗、慢落）
    float hh=hash21(cell+31.7);
    if(hh>0.93){ vec2 f=fract(gp)-0.5;
      col+=vec3(0.16,0.07,0.02)*glow(length(f)-0.08,0.06)*0.5*smoothstep(0.6,1.0,rad); } }
  { float aspx=uRes.x/uRes.y;                                            // 卷宗邊框殘影
    float fr1=glow(abs(abs(uv.x)-(aspx-0.10)),0.0028)+glow(abs(abs(uv.y)-0.90),0.0028);
    col+=vec3(0.35,0.27,0.14)*fr1*step(0.40,fbm2(uv*3.0+5.0))*0.06; }
  for(int i=0;i<4;i++){ float fi=float(i);                               // 失焦光斑（資料霧焦外）
    vec2 bp=rot(RT*0.01*(h11(fi+3.0)-0.5))*vec2(h11(fi*7.1)-0.5,h11(fi*13.3)-0.5)*2.6;
    float g2=exp(-dot(uv-bp,uv-bp)*(2.2+3.0*h11(fi+5.0)));
    vec3 bc=fi<1.5?vec3(0.30,0.20,0.06):(fi<2.5?vec3(0.06,0.16,0.12):vec3(0.18,0.05,0.03));
    col+=bc*g2*0.05; }

  // ═ 二 外圍儀式邊界 + 六 9 類碎片
  { vec2 pr=rot(RT*0.006)*uv; float a2=atan(pr.y,pr.x);
    float seg=step(0.25,fbm2(vec2(a2*2.2,7.7)));
    vec3 oc=mix(gold*0.5,teal*0.5,step(0.62,h11(floor(a2*3.0)+2.0)));
    oc=mix(oc,emberR*0.55,step(0.86,h11(floor(a2*5.0)+9.0)));
    col+=oc*glow(abs(length(pr)-1.28),0.0045)*seg*0.45*outerAmp; }
  { vec2 pr=rot(-RT*0.009+F*0.012*sin(t*28.0))*uv; float rr=length(pr);  // 9 類碎片
    if(rr>1.00&&rr<1.46){
      float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
      float cf=a2/TAU*120.0; float cell=floor(cf);
      float hh=h11(cell*1.31);
      if(hh>0.30){
        float cr=1.06+h11(cell+5.0)*0.34;
        vec2 g=vec2((fract(cf)-0.5)*(TAU*cr/120.0), rr-cr)/0.018;
        float ty=floor(h11(cell+9.0)*9.0);
        float d=1e9; float amp=1.0; vec3 fc=gold;
        if(ty<1.0){ d=sdSeg(g,vec2(-0.8,0.0),vec2(0.8,0.0)); }
        else if(ty<2.0){ d=abs(length(g-vec2(0.0,-2.0))-2.2); amp=0.8; }
        else if(ty<3.0){ vec2 b=abs(g)-vec2(0.7,0.18); d=length(max(b,vec2(0.0)))+min(max(b.x,b.y),0.0); amp=0.7; fc=mix(gold,teal,0.5); }
        else if(ty<4.0){ d=min(sdSeg(g,vec2(-0.6,-0.5),vec2(0.0,0.6)),min(sdSeg(g,vec2(0.0,0.6),vec2(0.6,-0.5)),sdSeg(g,vec2(-0.6,-0.5),vec2(0.6,-0.5)))); amp=0.6; }
        else if(ty<5.0){ d=glyphFam(g*0.9,cell*2.7,floor(h11(cell+3.0)*4.99)); amp=0.55; }
        else if(ty<6.0){ d=length(g)-0.16; amp=1.5; fc=plat; }
        else if(ty<7.0){ vec2 b2=abs(rot(0.6)*g)-vec2(0.5,0.5); d=abs(length(max(b2,vec2(0.0)))+min(max(b2.x,b2.y),0.0)); amp=0.30; }
        else { d=abs(length(g-vec2(0.0,-2.0))-2.2); amp=0.7*(0.4+0.6*fract(cf)); }
        float blink=0.55+0.45*sin(t*(0.8+2.0*h11(cell+7.0))+cell);
        fc=mix(fc,emberR,F*step(0.55,h11(cell+13.0)));
        col+=fc*glow(d,0.10)*amp*blink*0.38*outerAmp*(1.0+F*1.2); } } }
  { vec2 pr=rot(RT*0.004)*uv; float a2=atan(pr.y,pr.x);                   // 青綠索引結界（退場化）
    float gaps=step(0.30,fbm2(vec2(a2*2.3+9.0,2.0)));
    float breathe=0.85+0.15*sin(t*0.35);
    float occl=1.0-0.35*smokeMid;
    col+=teal*glow(abs(length(pr)-1.19),0.016)*0.12*gaps*(0.55+0.45*tFog)*breathe*occl*tealAmp;
    col+=gold*glow(abs(length(pr)-1.155),0.0035)*0.18*gaps*tealAmp;
    col+=teal*nodes(pr,1.19,9.0,0.0)*0.20*tealAmp;
    float cf2=(a2<0.0?a2+TAU:a2)/TAU*70.0; float cell2=floor(cf2);
    float bar=step(0.55,h11(cell2*1.7))*step(abs(fract(cf2)-0.5),0.12+0.2*h11(cell2+3.0));
    col+=mix(teal,gold,h11(cell2+5.0))*bar*smoothstep(0.012,0.004,abs(length(pr)-1.215))*0.22*tealAmp; }
  if(FL>0.01) col+=plat*glow(abs(rad-(1.0-FL)*1.55),0.012)*FL*0.45;       // 點火折射波外擴

  // ═ 三 資料軌道（最快層）
  { vec2 pr=rot(-RT*0.16)*uv; float rr=length(pr);
    if(rr>0.88&&rr<1.05){
      float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
      float cf=a2/TAU*110.0; float cell=floor(cf); float fx=abs(fract(cf)-0.5);
      float on=step(0.40,h11(cell*1.9));
      float bar=on*step(fx,0.10+0.32*h11(cell+3.3))*smoothstep(0.013,0.004,abs(rr-(0.93+0.07*h11(cell+5.5))));
      vec3 dc=mix(gold,teal,step(0.55,h11(cell+7.0))); dc=mix(dc,plat,step(0.86,h11(cell+9.0)));
      col+=dc*bar*(0.25+0.45*P)*(0.6+0.4*sin(t*3.0+cell*2.0))*outerGate; } }
  { vec2 pr=rot(RT*0.11)*uv; float rr=length(pr);
    if(rr>0.74&&rr<0.92){
      float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
      float cf=a2/TAU*64.0; float cell=floor(cf);
      if(h11(cell*2.3)>0.55){
        vec2 g=rot(0.5*(h11(cell+2.0)-0.5)+0.35)*vec2((fract(cf)-0.5)*(TAU*0.83/64.0), rr-(0.78+0.10*h11(cell+1.0)));
        col+=mix(teal,gold,h11(cell+4.0))*glow(sdSeg(g,vec2(-0.030,0.0),vec2(0.030,0.0)),0.0035)*0.45*P*outerGate; } } }

  // ═ 四 中圈主法陣（古代魔法機械盤，16 小層）
  col*=1.0-0.16*smoothstep(0.048,0.020,abs(rad-0.665))*midGate;          // 暗槽環
  { vec2 pr=rot(RT*0.012)*uv; float rr=length(pr); float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
    float L=0.0;
    L+=glow(abs(rr-0.615),0.0017)*0.85;                                   // 第一主圓
    L+=glow(abs(rr-0.715),0.0015)*0.55*step(0.18,fbm2(vec2(a2*2.5,4.4))); // 第二主圓（微斷）
    float NS=9.0; float sc=floor(a2/TAU*NS); float sf=fract(a2/TAU*NS);
    float so=h11(sc+31.0); float arcseg=step(sf,0.55+0.4*h11(sc+37.0))*step(0.25,so);
    float bri=mix(0.25,1.0,step(0.6,so));
    L+=smoothstep(0.040,0.0,abs(rr-0.665)-0.030)*0.040*arcseg*bri;        // 模組分區淡填
    L+=glow(abs(rr-0.648),0.0013)*arcseg*bri*0.5;
    col+=gold*L*0.55*mainAmp;
    col+=plat*tickRing(pr,0.585,240.0,0.0035,0.018,3.3)*0.45*mainAmp;     // 微刻度（內）
    col+=gold*tickRing(pr,0.742,200.0,0.0035,0.015,8.8)*0.38*mainAmp;     // 微刻度（外）
    col+=mix(plat,teal,step(0.5,h11(sc+77.0)))*nodes(pr,0.615,9.0,0.0)*0.7*mainAmp; // 節點光珠
    float nb=floor(a2/TAU*NS+0.5)/NS*TAU;                                  // 起點鎖扣（亮）/ 終點鎖扣（暗）
    col+=plat*latchAt(pr,vec2(cos(nb),sin(nb))*0.665,nb+1.5708,0.016)*0.8*mainAmp;
    col+=gold*latchAt(pr,vec2(cos(nb-0.10),sin(nb-0.10))*0.665,nb-0.10+1.5708,0.011)*0.35*mainAmp;
    float act=floor(mod(t*0.55,NS));                                       // 模組底光（演算輪播）
    float daA=mod(a2-act/NS*TAU+TAU,TAU);
    if(daA<TAU/NS) col+=gold*0.020*smoothstep(0.060,0.012,abs(rr-0.665))*computing*midGate; }
  { vec2 pr=rot(-RT*0.016)*uv; float rr=length(pr);                        // 齒輪細環（可缺齒）
    if(abs(rr-0.565)<0.010){
      float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
      float cf=a2/TAU*180.0; float cell=floor(cf);
      col+=gold*step(fract(cf),0.55)*step(0.12,h11(cell*1.3))*smoothstep(0.010,0.004,abs(rr-0.565))*0.18*mainAmp; } }
  for(int i=0;i<2;i++){ float fi=float(i);                                 // 偏心校準弧
    vec2 pe=rot(RT*(0.010+0.004*fi))*uv-vec2(0.014,-0.009)*(fi+1.0)*0.8;
    float aE=atan(pe.y,pe.x);
    col+=amber*glow(abs(length(pe)-(0.70+0.045*fi)),0.0016)
        *smoothstep(0.1,0.45,cos(aE-fi*2.4-RT*0.05))*0.28*mainAmp; }
  col+=gold*arcFrags(rot(RT*0.020)*uv,2.0)*0.34*mainAmp;                   // 斷裂短弧 順/逆
  col+=amber*arcFrags(rot(-RT*0.026)*uv,11.0)*0.27*mainAmp;
  { float bridges=0.0;                                                     // 環間細橋（演算亮）
    for(int i=0;i<18;i++){ float ai=float(i)/18.0*TAU+RT*0.008;
      vec2 dir=vec2(cos(ai),sin(ai));
      float along=dot(uv,dir); float dperp=abs(dot(uv,vec2(-dir.y,dir.x)));
      if(along>0.30&&along<0.585){
        float blink=0.30+0.70*max(0.0,sin(t*2.2+float(i)*1.7))*computing;
        bridges+=glow(dperp,0.0010)*smoothstep(0.30,0.34,along)*smoothstep(0.585,0.55,along)*blink; } }
    col+=gold*bridges*0.30*mainAmp; }
  for(int i=0;i<4;i++){ float fi=float(i);                                 // 資料讀取條
    float si=floor(h11(fi+44.0)*9.0); float a0=si/9.0*TAU+RT*0.012;
    float head=fract(t*0.22+fi*0.31); float span=head*(TAU/9.0)*0.8;
    float da=mod(ang-a0+TAU,TAU);
    if(da<span) col+=mix(gold*0.5,plat,da/max(span,0.001))*glow(abs(rad-0.692),0.0022)*0.45*computing*midGate;
    col+=plat*glow(length(uv-vec2(cos(a0+span),sin(a0+span))*0.692),0.004)*0.4*computing*midGate; }
  { float subd=0.0;                                                        // 子圓盤節點 ×4
    for(int i=0;i<4;i++){ float ai=1.5708*float(i)+0.7854+RT*0.012;
      vec2 c=vec2(cos(ai),sin(ai))*0.52; vec2 qd=uv-c;
      if(dot(qd,qd)<0.0036){
        float d=abs(length(qd)-0.024);
        d=min(d,length(qd)-0.006);
        float aa=atan(qd.y,qd.x);
        d=min(d,abs(length(qd)-0.016)+step(cos(aa-RT*0.3),0.2));
        subd+=glow(d,0.0028); } }
    col+=gold*subd*0.5*mainAmp; }
  { vec2 pr=rot(0.3927)*uv;                                                // 八方長定位刻度
    float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
    float fx=abs(fract(a2/TAU*8.0)-0.5)*(TAU*0.615/8.0);
    col+=plat*smoothstep(0.0040,0.0014,fx)*smoothstep(0.055,0.020,abs(length(pr)-0.760))*0.6*mainAmp;
    col+=gold*nodes(pr,0.806,8.0,0.0)*0.5*mainAmp; }

  // ═ 五 符文語法系統（內→外點亮 + 掃描 + 完成收束）
  float scan=1.0+1.6*pow(0.5+0.5*cos(ang-RT*0.9),24.0)*computing;
  float blinkA=mix(0.62+0.38*sin(t*1.3+ang*5.0),0.95,C);
  { vec2 pr=rot(RT*0.030)*uv;                                              // 核心短符（線族 白金）
    col+=plat*runeRingT(pr,0.345,72.0,7.0,0.022,0.0,F)*smoothstep(0.15,0.35,I)*scan*blinkA*0.85*mix(0.4,1.0,P); }
  { vec2 pr=rot(-RT*0.018)*uv; pr.y/=(0.96+0.04*sin(RT*0.15));             // 主咒文環（混族 琥珀）
    col+=mix(gold,amber,0.4)*runeRingT(pr,0.50,44.0,23.0,0.034,-1.0,F)*smoothstep(0.40,0.65,I)*scan*blinkA*0.80*mix(0.4,1.0,P); }
  { vec2 pr=rot(-RT*0.014)*uv; float rr=length(pr);                        // 外圈殘符
    if(rr>0.80&&rr<0.99){
      float a2=atan(pr.y,pr.x); if(a2<0.0)a2+=TAU;
      float cf=a2/TAU*110.0; float cell=floor(cf);
      if(h11(cell*1.3+5.0)>0.5){
        vec2 g=vec2((fract(cf)-0.5)*(TAU*0.89/110.0), rr-(0.83+0.12*h11(cell+9.0)))/0.020;
        if(abs(g.y)<1.5)
          col+=mix(gold,teal,0.25)*glow(glyphFam(g,cell*2.7+11.0,floor(h11(cell+4.0)*4.99)),0.11)
              *(0.3+0.7*fbm2(vec2(a2*2.0,RT*0.05)))*smoothstep(0.55,0.85,I)*0.45*mix(0.4,1.0,P); } } }
  for(int i=0;i<4;i++){ float ai=1.5708*float(i)+RT*0.030;                 // 節點符（鎖扣族 亮）
    vec2 c=vec2(cos(ai),sin(ai))*0.345; vec2 g=(uv-c)/0.020;
    if(dot(g,g)<4.0) col+=plat*glow(glyphFam(g,float(i)*7.7+3.0,4.0),0.10)*1.2*smoothstep(0.30,0.50,I)*mix(0.4,1.0,P); }

  // ═ 內圈封印穩定器（9 小層）
  col*=1.0-0.28*glow(abs(rad-0.205),0.010)*sealGate;                       // 核心暗部護圈
  col*=1.0-0.18*glow(abs(rad-0.229),0.0035)*sealGate;                      // 主環內側陰影（厚度）
  col+=plat*glow(abs(rad-0.235),0.0028)*(1.10+0.40*cp)*sealGate;           // 白金封印主環
  col+=plat*glow(abs(rad-0.242),0.0050)*0.22*sealGate;                     // 外側淡光（厚度）
  col+=gold*glow(abs(rad-0.256),0.012)*0.14*sealGate;                      // 封印外暈
  col+=vec3(1.0,0.93,0.80)*smoothstep(0.235,0.10,rad)*0.08*(0.6+0.4*cp)*sealGate; // 封印內暈
  { vec2 pr=rot(RT*0.05)*uv;                                               // 精密數值刻度
    col+=plat*tickRing(pr,0.274,120.0,0.0020,0.0090,5.5)*(0.40+0.30*cp)*sealGate; }
  for(int i=0;i<4;i++){ float fi=float(i);                                 // 四向鎖定節點（依序）
    float on=smoothstep(0.28+0.13*fi,0.37+0.13*fi,I);
    float aL=fi*1.5708;
    col+=plat*latchAt(uv,vec2(cos(aL),sin(aL))*0.235,aL+1.5708,0.012)*on*1.1; }
  for(int i=0;i<8;i++){ float fi=float(i);                                 // 八向輔助節點（演算微閃）
    float aL=fi*0.7854+0.3927;
    vec2 c=vec2(cos(aL),sin(aL))*0.235;
    col+=gold*glow(length(uv-c),0.0030)*(0.18+0.30*max(0.0,sin(t*3.0+fi*2.0))*computing)*sealGate; }
  { vec2 pr=rot(RT*0.02)*uv;                                               // 內側微型符文槽（刻入感）
    col+=plat*runeRingT(pr,0.212,64.0,15.0,0.011,0.0,F)*0.28*sealGate; }
  { vec2 pr=rot(RT*0.035)*uv; float aS=atan(pr.y,pr.x);                    // 旋轉保護罩
    col+=plat*glow(abs(length(pr)-0.185),0.012)*smoothstep(0.0,0.4,cos(aS*2.0))*0.05*sealGate; }
  for(int k=0;k<3;k++){ float fk=float(k);                                 // 壓縮同心紋（斷續、外推）
    float ph=fract(t*0.18+fk*0.33);
    float rrK=0.235+0.045*fk+0.06*ph+0.10*FL;
    col+=gold*glow(abs(rad-rrK),0.0030)*(1.0-ph)*step(0.25,fbm2(vec2(ang*2.0+fk*3.0,5.0)))*0.10*(0.4+0.6*P)*sealGate; }

  // ═ 七 白金智慧核心（10 小層）
  if(rad<0.14){                                                            // 暖白球體（體積 raymarch）
    vec3 ro=vec3(uv*5.0,-1.0); float T=1.0; vec3 acc=vec3(0.0);
    for(int i=0;i<24;i++){
      if(float(i)>=uSteps) break;
      vec3 p=ro+vec3(0.0,0.0,1.0)*(float(i)*0.09);
      float sd=length(p)-0.62;
      if(sd<0.0){
        vec3 qq=p; qq.xy=rot(t*0.5+p.z*1.8)*qq.xy;
        float den=max(fbm3(qq*3.0+vec3(0.0,0.0,t*0.5))*smoothstep(0.0,-0.25,sd)-0.16,0.0)*1.7;
        vec3 em=mix(gold,plat,smoothstep(0.55,0.0,length(p)))*(1.0/(0.20+dot(p,p)*2.2));
        acc+=T*den*em*0.060; T*=exp(-den*0.34);
        if(T<0.02) break; } }
    col+=acc*coreAmp*coreTint*0.85; }
  col+=plat*coreTint*smoothstep(0.022,0.0,rad)*1.45*coreAmp;               // 純白奇點（縮小）
  { float r0=0.105+0.010*fbm2(vec2(ang*2.5,t*0.7));                        // 金黃能量膜
    col+=gold*coreTint*glow(abs(rad-r0),0.0050)*0.70*coreAmp; }
  { float hp=smoothstep(0.55,0.9,P)+FL+F;                                  // 橘金熱量邊（高峰才顯）
    float r1=0.150+0.014*fbm2(vec2(ang*4.0+2.0,t*1.1));
    col+=amber*coreTint*glow(abs(rad-r1),0.0070)*0.40*min(hp,1.2)*(0.5+0.5*cp); }
  col+=plat*glow(abs(rad-0.185),0.0024)*0.22*sealGate;                     // 透明折射膜（亮膜邊）
  col*=1.0-0.20*glow(abs(rad-0.172),0.0070)*sealGate;                      //（膜內暗帶 → 球形感）
  { float fl4=pow(abs(cos(ang+0.12)),1500.0)*1.1;                          // 星芒：4 主（平時收斂、點火/完成才放）
    float fl8=pow(abs(cos(ang*2.0+0.62)),350.0)*0.40;
    float fl20=pow(abs(cos(ang*5.0+0.21)),90.0)*0.16;
    float flAmp=0.10+0.22*P+1.0*FL+0.5*C;
    col+=plat*coreTint*(fl4*smoothstep(0.90,0.08,rad)*flAmp
        +(fl8*smoothstep(0.55,0.07,rad)+fl20*smoothstep(0.38,0.06,rad))*(0.18+0.55*coreAmp)); }

  // ═ 八 因果放射線（7 類）
  float rayOcc=1.0-0.45*smoothstep(0.56,0.62,rad)*smoothstep(0.76,0.70,rad); // 穿中圈衰減
  { float holy=0.0;                                                        // 主聖光束 5（點火/完成瞬強）
    for(int i=0;i<5;i++){ float fi=float(i);
      float a0=fi/5.0*TAU+0.35+RT*0.010;
      float d=abs(mod(ang-a0+3.14159,TAU)-3.14159);
      holy+=exp(-d*d*2600.0)*smoothstep(0.18,0.30,rad)*smoothstep(1.25,0.55,rad); }
    col+=plat*holy*(0.05*P+0.85*FL)*rayOcc; }
  col+=gold*raysLayer(ang,rad,9.0,22.0)*0.09*P*rayOcc*midGate;             // 背景暈光束（糊、低透明）
  col+=mix(plat,gold,0.4)*pow(abs(cos(ang*9.0+RT*0.15)),50.0)
      *smoothstep(0.20,0.30,rad)*smoothstep(0.52,0.32,rad)*0.26*coreAmp;   // 次級短光刺
  for(int i=0;i<6;i++){ float fi=float(i);                                 // 資料連接線 + 移動光點
    float aL=RT*0.012+fi/6.0*TAU+0.26;
    vec2 dir=vec2(cos(aL),sin(aL));
    float along=dot(uv,dir); float dperp=abs(dot(uv,vec2(-dir.y,dir.x)));
    if(along>0.20&&along<0.64){
      float brk=1.0-F*step(0.4,h11(fi+8.0));                               // 失敗：資料線斷裂
      col+=teal*glow(dperp,0.0014)*0.22*P*smoothstep(0.20,0.27,along)*smoothstep(0.64,0.56,along)*brk*midGate;
      col+=teal*glow(length(uv-dir*(0.22+fract(t*0.30+fi*0.37)*0.40)),0.006)*0.40*P*brk*midGate; } }
  for(int i=0;i<3;i++){ float fi=float(i);                                 // 模組因果弧線
    float aA=h11(fi+21.0)*TAU+RT*0.012; float aB=aA+1.2+h11(fi+22.0)*1.5;
    float da=mod(ang-aA+TAU,TAU); float spanC=mod(aB-aA+TAU,TAU);
    if(da<spanC){
      float win=smoothstep(0.0,0.25,da)*smoothstep(spanC,spanC-0.25,da);
      col+=mix(teal,gold,0.5)*glow(abs(rad-0.755),0.0014)*win*0.22*computing*midGate;
      col+=plat*glow(length(uv-vec2(cos(aA+fract(t*0.4+fi*0.3)*spanC),sin(aA+fract(t*0.4+fi*0.3)*spanC))*0.755),0.005)*0.35*computing*midGate; } }
  { float d=abs(mod(ang-(-1.5708)+3.14159,TAU)-3.14159);                   // 完成：輸出方向亮起（向下）
    col+=plat*exp(-d*d*900.0)*smoothstep(0.20,0.40,rad)*smoothstep(1.20,0.60,rad)*0.50*C; }
  if(F>0.01){ for(int i=0;i<3;i++){ float fi=float(i);                     // 失敗：橘紅裂線
      float aC=h11(fi+77.0)*TAU;
      vec2 pp=vec2(cos(aC),sin(aC))*0.30; float dC=1e9;
      for(int s=0;s<3;s++){ float fs=float(s);
        float aS=aC+(h11(fi*7.0+fs+1.0)-0.5)*0.9;
        vec2 pn=pp+vec2(cos(aS),sin(aS))*0.28;
        dC=min(dC,sdSeg(uv,pp,pn)); pp=pn; }
      col+=emberR*glow(dC,0.0025)*F*0.8; } }
  if(pulse>0.001) col+=plat*glow(abs(rad-(1.0-pulse)*1.5),0.010)*pulse*0.9;

  col*=smoothstep(1.95,0.30,rad);                                          // 統一暗角收束
  gl_FragColor=vec4(col,1.0);
}`;

const COMPUTE_FRAG = `
uniform float uTime,uDelta,uPulse,uPower;
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x,289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159-0.85373472095314*r; }
float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx; i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y),p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
vec3 snVec3(vec3 x){ return vec3(snoise(x),snoise(vec3(x.y-19.1,x.z+33.4,x.x+47.2)),snoise(vec3(x.z+74.2,x.x-124.5,x.y+99.4))); }
vec3 curl(vec3 p){ const float e=0.1; vec3 dx=vec3(e,0.,0.),dy=vec3(0.,e,0.),dz=vec3(0.,0.,e);
  vec3 px0=snVec3(p-dx),px1=snVec3(p+dx),py0=snVec3(p-dy),py1=snVec3(p+dy),pz0=snVec3(p-dz),pz1=snVec3(p+dz);
  return normalize(vec3(py1.z-py0.z-pz1.y+pz0.y, pz1.x-pz0.x-px1.z+px0.z, px1.y-px0.y-py1.x+py0.x)/(2.0*e)); }
float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv=gl_FragCoord.xy/resolution.xy; vec4 data=texture2D(texturePosition,uv);
  vec3 pos=data.xyz; float life=data.w;
  float fam=h2(uv+0.123);
  vec3 c=curl(pos*0.26+uTime*0.04);
  vec3 vel;
  if(fam<0.15){      vel=normalize(pos+0.0001)*(3.2+2.0*h2(uv+0.5))+c*0.3; life-=uDelta*1.1; }   // 核心火花
  else if(fam<0.45){ vel=-normalize(pos+0.0001)*0.85+vec3(-pos.z,0.0,pos.x)*0.22+c*0.55; life-=uDelta*0.10; } // 向心資料粒
  else if(fam<0.65){ vel=normalize(pos+0.0001)*(2.2+2.0*h2(uv+0.7))+c*0.5; life-=uDelta*(0.40+0.35*uPower); } // 離心結果粒
  else if(fam<0.82){ vel=vec3(-pos.z,0.0,pos.x)*0.30+c*0.25; life-=uDelta*0.07; }                 // 中圈軌道粒
  else if(fam<0.93){ vel=c*0.22+vec3(-pos.z,0.0,pos.x)*0.06; life-=uDelta*0.05; }                 // 外圈碎屑粒
  else {             vel=c*0.30; life-=uDelta*0.045; }                                            // 遠景塵埃
  pos+=vel*uDelta*(1.0+uPulse*1.6);
  bool resp=(life<=0.0)||(fam>=0.15&&fam<0.45&&length(pos)<0.55);
  if(resp){
    float a=h2(uv*1.7+fract(uTime*0.001))*6.2831; float b=h2(uv+0.7)*3.1415;
    if(fam<0.15){ float r=0.15+h2(uv+1.1)*0.45; pos=vec3(sin(b)*cos(a),cos(b),sin(b)*sin(a))*r; life=0.35+h2(uv+2.0)*0.5; }
    else if(fam<0.45){ float r=6.0+h2(uv+1.3)*6.0; pos=vec3(sin(b)*cos(a),cos(b)*0.8,sin(b)*sin(a))*r; life=1.0+h2(uv+2.1); }
    else if(fam<0.65){ float r=0.4+h2(uv+1.9)*0.8; pos=vec3(sin(b)*cos(a),cos(b)*0.9,sin(b)*sin(a))*r; life=0.6+h2(uv+2.7)*0.8; }
    else if(fam<0.82){ float r=4.6+h2(uv+2.3)*1.4; pos=vec3(cos(a)*r,(h2(uv+3.1)-0.5)*1.2,sin(a)*r); life=1.2+h2(uv+3.5); }
    else if(fam<0.93){ float r=7.0+h2(uv+2.5)*3.0; pos=vec3(sin(b)*cos(a),cos(b)*0.9,sin(b)*sin(a))*r; life=1.4+h2(uv+3.7); }
    else { float r=9.0+h2(uv+2.9)*5.0; pos=vec3(sin(b)*cos(a),cos(b),sin(b)*sin(a))*r; life=1.6+h2(uv+4.1); } }
  gl_FragColor=vec4(pos,life);
}`;

const P_VERT = `
attribute vec2 aRef; attribute float aRand;
uniform sampler2D uPosTex; uniform float uSize,uPulse;
varying float vLife,vRand,vFam,vDist;
float h2(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec4 d=texture2D(uPosTex,aRef); vec3 p=d.xyz; vLife=d.w; vRand=aRand;
  vFam=h2(aRef+0.123); vDist=length(p);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  float fs=vFam<0.15?1.5:(vFam<0.45?0.8:(vFam<0.65?1.1:(vFam<0.82?0.7:(vFam<0.93?0.6:0.5))));
  float bokeh=step(0.985,aRand)*4.0+1.0;
  gl_PointSize=uSize*fs*bokeh*(0.35+aRand*0.9)*smoothstep(0.0,0.3,vLife)*(1.0+uPulse)/max(2.0,-mv.z);
  gl_Position=projectionMatrix*mv;
}`;

const P_FRAG = `
precision highp float;
uniform float uPower,uFail;
varying float vLife,vRand,vFam,vDist;
void main(){
  vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.0,d);
  vec3 gold=vec3(1.0,0.78,0.36),amber=vec3(1.0,0.6,0.2),plat=vec3(1.0,0.96,0.84),teal=vec3(0.3,0.85,0.78);
  vec3 col; float amp;
  if(vFam<0.15){ col=mix(plat,gold,vRand); amp=0.4+0.9*uPower; }
  else if(vFam<0.45){ col=mix(teal,vec3(1.0,0.9,0.6),vRand); amp=(0.30+0.65*uPower)*smoothstep(10.0,2.0,vDist); }
  else if(vFam<0.65){ col=mix(plat,amber,vRand); amp=0.22+0.80*uPower; }
  else if(vFam<0.82){ col=mix(gold,amber,vRand*0.6); amp=0.30+0.35*uPower; }
  else if(vFam<0.93){ col=mix(gold,vec3(0.6,0.45,0.25),0.5); amp=0.22; }
  else { col=vec3(0.85,0.75,0.55); amp=0.18; }
  col=mix(col,vec3(1.0,0.25,0.10),uFail*step(0.6,vRand));
  float bokehA=mix(1.0,0.22,step(0.985,vRand));
  gl_FragColor=vec4(col, a*(0.45+vRand*0.5)*smoothstep(0.0,0.3,vLife)*amp*bokehA);
}`;

const CINE_FRAG = `
precision highp float; uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
float hash21(vec2 p){ vec3 p3=fract(vec3(p.xyx)*0.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec2 uv=vUv; vec2 cc=uv-0.5; float r=length(cc);
  float ca=0.0011*r; vec3 col;
  col.r=texture2D(tDiffuse,uv+cc*ca).r; col.g=texture2D(tDiffuse,uv).g; col.b=texture2D(tDiffuse,uv-cc*ca).b;
  col=col/(col+vec3(0.9))*1.9; col*=vec3(1.06,1.0,0.94); col+=vec3(0.0,0.012,0.03)*(1.0-col);
  float g=hash21(gl_FragCoord.xy+floor(uTime*40.0)); col+=(g-0.5)*0.026;
  col*=smoothstep(1.10,0.34,r);
  gl_FragColor=vec4(col,1.0);
}`;

/**
 * 建立 SAGE CORE IGNITION VFX。所有 three 依賴注入；零 import。
 * @returns { setSize, setRenderScale, frame(dt), setPhase, nudge, pulse, phaseName(), dispose }
 */
export function buildSageVfx(deps) {
  const { THREE, GPUComputationRenderer, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass,
          canvas, quality = "ultra", calm = false, afterIgnition = "operational" } = deps;
  const Q = QUALITY[quality] || QUALITY.ultra;
  const calmMul = calm ? 0.55 : 1.0;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const basePR = Math.min(window.devicePixelRatio || 1, Q.dprCap);
  let renderScale = 1;
  renderer.setPixelRatio(basePR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(0, 0, 16);
  const uRes = new THREE.Vector2(1, 1);
  const U = {
    uTime:{value:0}, uRT:{value:0}, uRes:{value:uRes}, uSteps:{value:Q.steps},
    uPower:{value:0.18}, uIgnite:{value:0}, uFail:{value:0}, uFlash:{value:0}, uComplete:{value:0}, uPulse:{value:0},
  };

  // 背景大著色器
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  const bgMat = new THREE.ShaderMaterial({ uniforms: U, depthTest:false, depthWrite:false,
    vertexShader: "void main(){ gl_Position=vec4(position.xy,0.0,1.0); }", fragmentShader: BG_FRAG });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  bgMesh.frustumCulled = false; bgMesh.renderOrder = -10; scene.add(bgMesh);

  // GPGPU 粒子（7 層族群）
  const W = Q.texW, PCOUNT = W * W;
  const gpu = new GPUComputationRenderer(W, W, renderer);
  const dtPos = gpu.createTexture();
  { const a = dtPos.image.data;
    for (let i = 0; i < a.length; i += 4) {
      const ang = Math.random()*Math.PI*2, b = Math.acos(2*Math.random()-1), r = 3.0+Math.random()*9.0;
      a[i]=Math.sin(b)*Math.cos(ang)*r; a[i+1]=Math.cos(b)*r*0.8; a[i+2]=Math.sin(b)*Math.sin(ang)*r; a[i+3]=Math.random();
    } }
  const posVar = gpu.addVariable("texturePosition", COMPUTE_FRAG, dtPos);
  gpu.setVariableDependencies(posVar, [posVar]);
  posVar.material.uniforms.uTime={value:0}; posVar.material.uniforms.uDelta={value:0.016};
  posVar.material.uniforms.uPulse={value:0}; posVar.material.uniforms.uPower={value:0.18};
  const gpuErr = gpu.init(); if (gpuErr) throw new Error("GPGPU: " + gpuErr);

  const pGeo = new THREE.BufferGeometry();
  const refs = new Float32Array(PCOUNT*2), rnd = new Float32Array(PCOUNT);
  for (let i = 0; i < PCOUNT; i++) { refs[i*2]=(i%W)/W; refs[i*2+1]=Math.floor(i/W)/W; rnd[i]=Math.random(); }
  pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PCOUNT*3), 3));
  pGeo.setAttribute("aRef", new THREE.BufferAttribute(refs, 2));
  pGeo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending,
    uniforms:{ uPosTex:{value:null}, uSize:{value:20.0*basePR}, uPulse:{value:0}, uPower:{value:0.18}, uFail:{value:0} },
    vertexShader: P_VERT, fragmentShader: P_FRAG,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false; points.renderOrder = 1; scene.add(points);

  // 後製：Bloom 分區紀律（threshold 0.70 → 只有核心/封印/火花發光）+ 電影 pass
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), 0.48, 0.40, 0.72);
  composer.addPass(bloom);
  const cinematic = new ShaderPass({
    uniforms:{ tDiffuse:{value:null}, uTime:{value:0}, uRes:{value:uRes} },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: CINE_FRAG,
  });
  composer.addPass(cinematic);
  composer.addPass(new OutputPass());

  // 階段狀態機（規格 十一 + Pass2 §9）
  const PH = { name:"idle", power:0.18, powerT:0.18, ignite:0, igniteT:0, fail:0, flash:0, complete:0,
               rotMult:0.45, rotMultT:0.45, rt:0, timer:0, after:null, pulse:0, t:0 };
  function setPhase(p) {
    PH.name = p; PH.timer = 0; PH.after = null;
    if (p === "idle")        { PH.powerT=0.18; PH.igniteT=0.12; PH.rotMultT=0.45; }
    if (p === "ignition")    { PH.power=1.05; PH.powerT=0.78; PH.igniteT=1; PH.rotMultT=1.5; PH.flash=1; PH.after=[0.95, afterIgnition]; }
    if (p === "operational") { PH.powerT=0.45; PH.igniteT=1; PH.rotMultT=0.9; }
    if (p === "computing")   { PH.powerT=0.78; PH.igniteT=1; PH.rotMultT=1.6; }
    if (p === "complete")    { PH.power=1.0; PH.powerT=0.45; PH.igniteT=1; PH.flash=0.8; PH.complete=1; PH.rotMultT=0.8; PH.after=[2.6, "operational"]; }
    if (p === "failed")      { PH.fail=1; PH.powerT=0.35; PH.rotMultT=2.0; PH.after=[0.85, "operational"]; }
  }
  function frame(dt) {
    PH.t += dt; PH.timer += dt;
    if (PH.after && PH.timer >= PH.after[0]) { const nx = PH.after[1]; PH.after = null; setPhase(nx); }
    PH.power  += (PH.powerT  - PH.power)  * Math.min(1, dt*4.0);
    PH.ignite += (PH.igniteT - PH.ignite) * Math.min(1, dt*3.0);
    PH.fail   *= Math.exp(-dt*3.0);
    PH.flash  *= Math.exp(-dt*2.6);
    PH.complete += ((PH.name === "complete" ? 1 : 0) - PH.complete) * Math.min(1, dt*1.4);
    PH.rotMult += (PH.rotMultT - PH.rotMult) * Math.min(1, dt*2.0);
    PH.rt += dt * PH.rotMult * calmMul;
    PH.pulse *= 0.95;
    U.uTime.value = PH.t; U.uRT.value = PH.rt;
    U.uPower.value = PH.power; U.uIgnite.value = PH.ignite; U.uFail.value = PH.fail;
    U.uFlash.value = PH.flash; U.uComplete.value = PH.complete; U.uPulse.value = PH.pulse;
    posVar.material.uniforms.uTime.value = PH.t; posVar.material.uniforms.uDelta.value = dt;
    posVar.material.uniforms.uPulse.value = PH.pulse; posVar.material.uniforms.uPower.value = PH.power;
    gpu.compute();
    pMat.uniforms.uPosTex.value = gpu.getCurrentRenderTarget(posVar).texture;
    pMat.uniforms.uPulse.value = PH.pulse; pMat.uniforms.uPower.value = PH.power; pMat.uniforms.uFail.value = PH.fail;
    cinematic.uniforms.uTime.value = PH.t;
    camera.position.x = Math.sin(PH.t*0.10)*0.7*calmMul;
    camera.position.y = Math.cos(PH.t*0.08)*0.35*calmMul;
    camera.lookAt(0, 0, 0);
    composer.render();
  }
  function setSize(w, h) {
    renderer.setPixelRatio(basePR * renderScale);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(basePR * renderScale);
    composer.setSize(w, h);
    bloom.setSize(w * basePR * renderScale, h * basePR * renderScale);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    uRes.set(w * basePR * renderScale, h * basePR * renderScale);
  }
  function setRenderScale(s) { renderScale = Math.max(0.5, Math.min(1, s)); setSize(window.innerWidth, window.innerHeight); }
  function dispose() {
    try { bgGeo.dispose(); bgMat.dispose(); pGeo.dispose(); pMat.dispose(); } catch {}
    try { posVar.renderTargets?.forEach((r) => r.dispose()); } catch {}
    try { gpu.dispose?.(); } catch {}
    try { rt.dispose(); composer.dispose?.(); bloom.dispose?.(); } catch {}
    try { renderer.dispose(); } catch {}
  }
  return {
    setSize, setRenderScale, frame, setPhase, dispose,
    nudge(v) { PH.power = Math.min(1, PH.power + v); PH.pulse = 1; },
    pulse() { PH.pulse = 1; },
    phaseName() { return PH.name; },
    toggleBloom() { bloom.enabled = !bloom.enabled; },
    toggleCinematic() { cinematic.enabled = !cinematic.enabled; },
  };
}
