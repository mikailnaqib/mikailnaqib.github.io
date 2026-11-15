/* The scroll-driven background on every page:
     - a pair of wings (with a flock of swallows above them) that stays in place and opens as you scroll
     - a wild garden of sprigs, ferns and flowers that grows in from the page edges as you reach it
     - a stone surface (images/stone-light.webp / stone-dark.webp) with hairline veins
   The look (colors and strengths) is set in styles.css under "Scroll background".

   ===== SETTINGS: edit here ===== */
var BACKGROUND = {
  SHOW: true,          // false turns the whole background off
  PLANT_SPACING: 440,  // average distance down the page between plants (bigger = fewer plants)
  WEAR_IMAGE: "images/wear.png"   // the worn-ink pattern; set to "" for clean lines
};

(function(){
"use strict";
const CFG=BACKGROUND;
if(!CFG.SHOW||!document.createElementNS||!window.requestAnimationFrame)return;

const NS="http://www.w3.org/2000/svg";
const $=(n,a,p)=>{const e=document.createElementNS(NS,n);if(a)for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
const lerp=(a,b,t)=>a+(b-a)*t;
const c01=x=>x<0?0:x>1?1:x;
const ease=t=>{t=c01(t);return t*t*(3-2*t)};
const f=n=>(Math.round(n*10)/10);
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
let W=0,H=0,DOCH=0;   // page width, screen height, full page height

/* a feather lying along +x, base at the origin */
function featherD(L,w){
  return "M0 0C"+f(L*.25)+" "+f(-w)+" "+f(L*.86)+" "+f(-w*.9)+" "+f(L)+" 0C"+f(L*.86)+" "+f(w*.9)+" "+f(L*.25)+" "+f(w)+" 0 0Z";
}
/* Paints the two wings into a 2D context. Self-contained on purpose: it is also copied into a
   background worker thread, so the wings can be redrawn without ever holding up scrolling. */
function paintWings(c,S,o){
  const D=Math.PI/180,lp=(a,b,t)=>a+(b-a)*t,u=S.u,k=S.k,ox=S.box.w/2,oy=S.box.h*.6,C=S.col;
  if(!S.paths)S.paths=S.fe.map(q=>({p:new Path2D(q.d),h:new Path2D(q.hd)}));
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,c.canvas.width,c.canvas.height);c.lineCap=c.lineJoin="round";
  const p1x=lp(.14,.42,o)*u,p1y=lp(-.24,-.38,o)*u,p2x=lp(.2,.9,o)*u,p2y=lp(.36,0,o)*u;
  for(const side of [1,-1]){
    S.fe.forEach((q,i)=>{
      const t=q.t,x=2*(1-t)*t*p1x+t*t*p2x,yy=2*(1-t)*t*p1y+t*t*p2y,ang=lp(lp(93,80,t),lp(100,20,t),o)+q.da*o,P=S.paths[i];
      c.setTransform(k*side,0,0,k,ox*k,oy*k);c.translate(x,yy);c.rotate(ang*D);
      c.fillStyle=C.paper;c.fill(P.p);c.strokeStyle=C.ink;c.lineWidth=1.2;c.stroke(P.p);
      c.strokeStyle=C.soft;c.lineWidth=.8;c.stroke(P.h);
    });
    c.setTransform(k*side,0,0,k,ox*k,oy*k);
    c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(p1x,p1y,p2x,p2y);c.strokeStyle=C.ink;c.lineWidth=1.6;c.stroke();
  }
  if(S.wear){   /* worn ink: knock out gaps, pinned to where the wings sit on screen */
    if(!S.pat)S.pat=c.createPattern(S.wear,"repeat");
    c.setTransform(k,0,0,k,0,0);c.translate(-S.wx,-S.wy);
    c.globalCompositeOperation="destination-out";c.fillStyle=S.pat;c.fillRect(S.wx,S.wy,S.box.w,S.box.h);
    c.globalCompositeOperation="source-over";
  }
}
/* the background thread: holds the wings canvas and redraws it on request, always skipping to the newest request */
const WING_WORKER="const paintWings="+paintWings.toString()+";\n"+
  "let c=null,S=null,want=null,last=null,wear=null;"+
  "function run(){if(want===null||!c||!S)return;const o=want;want=null;last=o;S.wx=o.wx;S.wy=o.wy;paintWings(c,S,o.o)}"+
  "onmessage=e=>{const m=e.data;if(m.canvas)c=m.canvas.getContext('2d');if(m.S){S=m.S;S.wear=wear}if(m.wearUrl){fetch(m.wearUrl).then(r=>r.blob()).then(createImageBitmap).then(b=>{wear=b;if(S){S.wear=b;S.pat=null}if(want===null)want=last;run()}).catch(()=>{})}if(m.col&&S)S.col=m.col;"+
  "if(m.o)want=m.o;else if(want===null)want=last;run()};";

/* =========================== WINGS: fixed behind the page, open as you scroll ===========================
   Built for smooth scrolling:
   - the wings are drawn on a <canvas> that only redraws when their shape actually changes
   - each bird and each drifting feather is drawn once into its own little canvas; scrolling only moves,
     turns and scales those (a "transform"), which the graphics card does without repainting anything */
const D2R=Math.PI/180;
const BIRD={
  wing:new Path2D("M.06 -.32C.42 -.46 .8 -.22 1.1 .28C.78 .08 .46 .04 .06 .12Z"),
  wingHair:new Path2D("M.2 -.22C.48 -.22 .74 -.04 .96 .18M.18 -.06C.38 -.08 .56 -.02 .72 .06"),
  tail:new Path2D("M-.07 .28L-.22 .9L0 .58L.22 .9L.07 .28Z"),
  body:new Path2D("M0 -.62L.05 -.5C.13 -.42 .15 -.1 .08 .26L0 .46L-.08 .26C-.15 -.1 -.13 -.42 -.05 -.5Z")
};
const wings={
  col:{},
  colors(){
    const cs=getComputedStyle(document.documentElement),g=k=>cs.getPropertyValue(k).trim();
    this.col={ink:g("--art"),soft:g("--art-soft"),acc:g("--art-accent"),paper:g("--paper")};
  },
  /* fill + outline + hairline of one shape, in the context's current transform */
  shape(c,p,h,ink,lw){
    c.fillStyle=this.col.paper;c.fill(p);
    c.strokeStyle=ink;c.lineWidth=lw;c.stroke(p);
    if(h){c.strokeStyle=ink===this.col.acc?ink:this.col.soft;c.lineWidth=lw*.67;c.stroke(h)}
  },
  /* knock the worn-ink gaps out of a canvas; ox/oy shift the pattern so every sprite wears differently */
  weather(c,w,h,ox,oy,scale){
    const img=this.wear;if(!img||!img.complete||!img.naturalWidth)return;
    const pat=c.createPattern(img,"repeat");
    c.save();const k=scale||this.dpr;c.setTransform(k,0,0,k,0,0);c.translate(-ox,-oy);
    c.globalCompositeOperation="destination-out";c.fillStyle=pat;c.fillRect(ox,oy,w,h);c.restore();
  },
  build(host,wear){
    this.host=host;this.wear=wear;this.colors();
    const dpr=this.dpr=Math.min(1.5,window.devicePixelRatio||1);
    const u=this.u=Math.min(W*0.5,800)/1.36,mkF=(L,w)=>({L,w,p:new Path2D(featherD(L,w)),h:new Path2D("M0 0L"+f(L*.95)+" 0")});
    /* the wings' own canvas only covers the area the wings can reach */
    this.box={w:Math.ceil(u*2.1),h:Math.ceil(u*1.25)};
    host.textContent="";
    const cv=this.cv=document.createElement("canvas");cv.className="bg-wingart";host.appendChild(cv);
    const wd=Math.min(1,dpr);   // the wings are faint, soft lines: normal resolution is plenty and redraws faster
    cv.style.width=this.box.w+"px";cv.style.height=this.box.h+"px";
    this.lastKey="";
    this.fe=[];
    const rows=[{n:17,l0:.27,l1:.58,w:.1,da:0},{n:14,l0:.16,l1:.28,w:.15,da:-8},{n:12,l0:.085,l1:.14,w:.2,da:-14}];
    rows.forEach(r=>{
      for(let i=0;i<r.n;i++){           /* tip first, so inner feathers overlap outer ones */
        const t=1-(i+.5)/r.n;
        let L=u*lerp(r.l0,r.l1,t);if(t>.86)L*=1-(t-.86)*1.6;
        this.fe.push({d:featherD(L,L*r.w),hd:"M0 0L"+f(L*.95)+" 0",t,da:r.da});
      }
    });
    this.S={u,k:wd,box:this.box,fe:this.fe,col:this.col,wear:null};
    this.useWorker(cv,Math.round(this.box.w*wd),Math.round(this.box.h*wd));
    /* drifting feathers and the flock: one small canvas each */
    const R=rng(11),sprite=(w,h)=>{const c=document.createElement("canvas");c.className="bg-sprite";c.width=Math.ceil(w*dpr);c.height=Math.ceil(h*dpr);c.style.width=w+"px";c.style.height=h+"px";host.appendChild(c);return c};
    this.fall=[];
    for(let i=0;i<9;i++){
      const d=lerp(.45,1,R()),q=Object.assign(mkF(lerp(26,54,d),lerp(4,8,d)),{acc:i%4===0,x:R()*W,y0:R()*(H+240),d,ph:R()*6.28,ox:R()*512,oy:R()*512});
      q.cv=sprite(q.L+6,q.w*2+6);this.fall.push(q);
    }
    const flock=[[0,.5,.15,0],[-27,.6,.115,.07],[25,.66,.125,.13],[-52,.55,.1,.19],[50,.52,.105,.25],[-10,.82,.095,.31],[14,.92,.08,.37],[-40,.82,.085,.43],[38,.8,.09,.49],[-66,.68,.075,.54],[64,.7,.075,.58]];
    this.birds=flock.map((b,i)=>{
      const s=Math.max(13,b[2]*u),bd={acc:i===0,a:b[0]*D2R,r:b[1],s,t:b[3],head:b[0]*.75+(i%3-1)*7,ox:R()*512,oy:R()*512,vis:null};
      bd.cv=sprite(s*2.4,s*1.7);return bd;
    });
    this.paintSprites();
  },
  /* draw every bird and drifting feather once (again only when the theme changes) */
  paintSprites(){
    const dpr=this.dpr,C=this.col;
    for(const q of this.fall){
      const c=q.cv.getContext("2d"),w=q.L+6,h=q.w*2+6;
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,q.cv.width,q.cv.height);c.lineCap=c.lineJoin="round";
      c.setTransform(dpr,0,0,dpr,3*dpr,(q.w+3)*dpr);this.shape(c,q.p,q.h,q.acc?C.acc:C.ink,1.2);
      this.weather(c,w,h,q.ox,q.oy);
    }
    for(const b of this.birds){
      const c=b.cv.getContext("2d"),s=b.s,w=s*2.4,h=s*1.7,ink=b.acc?C.acc:C.ink,lw=1.2/s;
      c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,b.cv.width,b.cv.height);c.lineCap=c.lineJoin="round";
      for(const sx of [1,-1]){
        c.setTransform(dpr*s*sx,0,0,dpr*s,w/2*dpr,s*.66*dpr);
        c.fillStyle=C.paper;c.fill(BIRD.wing);c.strokeStyle=ink;c.lineWidth=lw;c.stroke(BIRD.wing);c.lineWidth=lw*.67;c.stroke(BIRD.wingHair);
      }
      c.setTransform(dpr*s,0,0,dpr*s,w/2*dpr,s*.66*dpr);
      for(const pth of [BIRD.tail,BIRD.body]){c.fillStyle=C.paper;c.fill(pth);c.strokeStyle=ink;c.lineWidth=lw;c.stroke(pth)}
      this.weather(c,w,h,b.ox,b.oy);
    }
    this.lastKey="";
  },
  recolor(){this.colors();this.paintSprites();this.S.col=this.col;if(this.worker)this.worker.postMessage({col:this.col})},
  /* hand the wings canvas to the background thread if the browser can; otherwise draw it here */
  useWorker(cv,w,h){
    this.ctx=null;
    if(cv.transferControlToOffscreen&&window.Worker&&window.Blob){
      try{
        if(!this.worker)this.worker=new Worker(URL.createObjectURL(new Blob([WING_WORKER],{type:"text/javascript"})));
        const off=cv.transferControlToOffscreen();off.width=w;off.height=h;
        const S=Object.assign({},this.S,{wear:null,paths:null,pat:null});
        this.worker.postMessage({canvas:off,S},[off]);
        this.sendWear();return;
      }catch(e){this.worker=null}
    }
    cv.width=w;cv.height=h;this.ctx=cv.getContext("2d");this.S.wear=this.wear&&this.wear.complete?this.wear:null;
  },
  sendWear(){
    const img=this.wear;if(!img||!img.complete||!img.naturalWidth)return;
    if(this.worker){if(!this.wearSent){this.wearSent=true;this.worker.postMessage({wearUrl:new URL(CFG.WEAR_IMAGE,location.href).href})}}
    else{this.S.wear=img;this.S.pat=null;this.lastKey=""}
  },
  render(p,y){
    if(!this.S)return;
    const u=this.u,dpr=this.dpr,C=this.col,e=ease(p),o=lerp(.2,1,ease(p*1.2));
    const cx=W/2,cy=H*lerp(.6,.47,e),bx=cx-this.box.w/2,by=cy-this.box.h*.6;
    /* the wings: move their canvas with a transform; redraw only when the opening has changed visibly */
    this.cv.style.transform="translate3d("+f(bx)+"px,"+f(by)+"px,0)";
    const key=Math.round(o*120);   // about 100 redraws across the whole page
    if(key!==this.lastKey){
      this.lastKey=key;
      const req={o,wx:bx,wy:by};
      if(this.worker)this.worker.postMessage({o:req});
      else if(this.ctx){this.S.wx=bx;this.S.wy=by;paintWings(this.ctx,this.S,o)}
    }
    /* the flock grows in; flapping is a quick horizontal squeeze of each bird */
    this.birds.forEach((b,i)=>{
      const k=ease((p-b.t)/.3),st=b.cv.style;
      if(k<=0){if(b.vis!==false){st.visibility="hidden";b.vis=false}return}
      if(b.vis!==true){st.visibility="visible";b.vis=true}
      const fl=.78+.22*Math.sin(y*.02+i*1.7),r=u*b.r*(.6+.4*k),s=b.s;
      const x=cx+Math.sin(b.a)*r,yy=cy-Math.cos(b.a)*r;
      st.transform="translate3d("+f(x)+"px,"+f(yy)+"px,0)rotate("+f(b.head)+"deg)scale("+f(k*fl*100)/100+","+f(k*100)/100+")translate("+f(-s*1.2)+"px,"+f(-s*.66)+"px)";
    });
    /* drifting feathers */
    const span=H+240;
    for(const q of this.fall){
      const yy=((q.y0+y*.32*q.d)%span+span)%span-120,xx=q.x+Math.sin(y*.003+q.ph)*46*q.d;
      q.cv.style.transform="translate3d("+f(xx)+"px,"+f(yy)+"px,0)rotate("+f(72+Math.sin(y*.004+q.ph)*42)+"deg)translate(-3px,"+f(-(q.w+3))+"px)";
    }
  }
};

/* =========================== GARDEN: wild sprigs, ferns and big flowers that grow in as you reach them =========================== */
/* --- plant parts, each drawn around the origin --- */
function leaf(g,narrow){
  g.setAttribute("class","solid");
  if(narrow){$("path",{d:"M0 0C10 -7 32 -6 44 0C32 6 10 7 0 0Z"},g);$("path",{d:"M0 0L41 0M10 0l6 -3.5M10 0l6 3.5M20 0l6 -3.5M20 0l6 3.5M30 0l5 -2.5M30 0l5 2.5",class:"hair soft"},g)}
  else{$("path",{d:"M0 0C8 -12 23 -12 31 0C23 12 8 12 0 0Z"},g);$("path",{d:"M0 0L29 0",class:"hair"},g);$("path",{d:"M6 0l6 -6M6 0l6 6M13 0l6 -6.5M13 0l6 6.5M20 0l5 -5M20 0l5 5",class:"hair soft"},g)}
}
function petalRing(g,r,n,rot){
  const d="M0 0C"+f(r*.2)+" "+f(-r*.42)+" "+f(r*.86)+" "+f(-r*.5)+" "+f(r*.98)+" "+f(-r*.09)+"L"+f(r*.9)+" 0L"+f(r*.98)+" "+f(r*.09)+"C"+f(r*.86)+" "+f(r*.5)+" "+f(r*.2)+" "+f(r*.42)+" 0 0Z";
  const v="M"+f(r*.2)+" 0L"+f(r*.74)+" 0M"+f(r*.26)+" 0Q"+f(r*.5)+" "+f(-r*.1)+" "+f(r*.7)+" "+f(-r*.2)+"M"+f(r*.26)+" 0Q"+f(r*.5)+" "+f(r*.1)+" "+f(r*.7)+" "+f(r*.2);
  for(let i=0;i<n;i++){const pg=$("g",{transform:"rotate("+f(rot+i*360/n)+")"},g);$("path",{d},pg);$("path",{d:v,class:"hair"},pg)}
}
/* a big open flower seen from above: notched, veined petals (optionally a second inner ring) and a ring of stamens */
function bloom(g,r,n,layered){
  g.setAttribute("class","acc solid");
  petalRing(g,r,n,0);
  if(layered)petalRing(g,r*.6,n,180/n);
  let st="";
  for(let i=0;i<11;i++){const a=i/11*6.2832,c=Math.cos(a),s=Math.sin(a);st+="M"+f(c*r*.13)+" "+f(s*r*.13)+"L"+f(c*r*.27)+" "+f(s*r*.27);$("circle",{cx:f(c*r*.3),cy:f(s*r*.3),r:f(Math.max(1,r*.035))},g)}
  $("path",{d:st,class:"hair"},g);$("circle",{r:f(r*.13)},g);
}
function daisy(g,r){
  g.setAttribute("class","solid");
  for(let i=0;i<15;i++)$("ellipse",{cx:f(r*.62),cy:0,rx:f(r*.38),ry:f(r*.085),transform:"rotate("+(i*24)+")"},g);
  const c=$("g",{class:"acc solid"},g);$("circle",{r:f(r*.22)},c);
  for(let i=0;i<6;i++){const a=i/6*6.2832;$("circle",{cx:f(Math.cos(a)*r*.11),cy:f(Math.sin(a)*r*.11),r:f(Math.max(.8,r*.03)),class:"hair"},c)}
}
function bud(g,r){
  g.setAttribute("class","acc solid");
  $("path",{d:"M0 0C"+f(r*.3)+" "+f(-r*.55)+" "+f(r*1.2)+" "+f(-r*.4)+" "+f(r*1.5)+" 0C"+f(r*1.2)+" "+f(r*.4)+" "+f(r*.3)+" "+f(r*.55)+" 0 0Z"},g);
  $("path",{d:"M"+f(r*.5)+" "+f(-r*.36)+"Q"+f(r*.9)+" 0 "+f(r*1.45)+" 0M"+f(r*.5)+" "+f(r*.36)+"Q"+f(r*.9)+" 0 "+f(r*1.45)+" 0",class:"hair"},g);
  $("path",{d:"M0 0C"+f(r*.2)+" "+f(-r*.5)+" "+f(r*.5)+" "+f(-r*.62)+" "+f(r*.75)+" "+f(-r*.6)+"M0 0C"+f(r*.2)+" "+f(r*.5)+" "+f(r*.5)+" "+f(r*.62)+" "+f(r*.75)+" "+f(r*.6),style:"stroke:var(--art)"},g);
}
function berries(g,r){
  for(const [a,l] of [[-34,1],[4,1.25],[38,.95],[-8,.6]]){
    const c=Math.cos(a*.01745),s=Math.sin(a*.01745);
    $("path",{d:"M0 0Q"+f(c*r*l*.6)+" "+f(s*r*l*.2)+" "+f(c*r*l)+" "+f(s*r*l)},g);
    $("circle",{cx:f(c*r*(l+.22)),cy:f(s*r*(l+.22)),r:f(r*.22),class:"acc solid"},g);
  }
}

const garden={
  build(svg){
    const docH=DOCH;
    svg.setAttribute("viewBox","0 0 "+W+" "+docH);svg.style.height=docH+"px";
    const sc=Math.min(1.15,Math.max(.62,W/1100)),R=rng(41),D=Math.PI/180;
    const stems=this.stems=[],pops=this.pops=[];
    const pop=(el,y0,d,x,y,rot,s)=>pops.push({el,y0,d,x,y,rot,s,k:-1});
    const curve=(x,y,ang,len,wd,d0,y0)=>{
      const bend=(R()-.5)*1.15,a1=ang+bend*.5,ex=x+Math.cos(a1)*len,ey=y+Math.sin(a1)*len;
      const mx=(x+ex)/2-Math.sin(a1)*len*bend*.42,my=(y+ey)/2+Math.cos(a1)*len*bend*.42;
      const el=$("path",{d:"M"+f(x)+" "+f(y)+"Q"+f(mx)+" "+f(my)+" "+f(ex)+" "+f(ey),"stroke-width":wd},svg);
      const total=el.getTotalLength();el.setAttribute("stroke-dasharray",f(total)+" "+f(total));
      stems.push({el,y0,d0,len,total,last:-1});
      return t=>{const u=1-t;return [u*u*x+2*u*t*mx+t*t*ex,u*u*y+2*u*t*my+t*t*ey,Math.atan2(2*u*(my-y)+2*t*(ey-my),2*u*(mx-x)+2*t*(ex-mx))]};
    };
    const branch=(x,y,ang,len,depth,d0,y0)=>{
      const at=curve(x,y,ang,len,depth?1.2:1.9,d0,y0);
      const gap=lerp(30,46,R())*sc;let sgn=R()<.5?1:-1;
      for(let s=gap*.9;s<len*.92;s+=gap*lerp(.7,1.5,R())){
        const [px,py,ta]=at(s/len);sgn=-sgn;
        const g=$("g",null,svg);leaf(g,R()<.3);
        pop(g,y0,d0+s,px,py,ta/D+sgn*lerp(36,74,R()),lerp(.75,1.4,R())*sc*(depth?.8:1));
      }
      if(depth<2){
        const n=depth===0?1+(R()<.45?1:0):(R()<.3?1:0);
        for(let i=0;i<n;i++){
          const t=lerp(.26,.82,R()),[px,py,ta]=at(t);
          branch(px,py,ta+(R()<.5?1:-1)*lerp(26,66,R())*D,len*lerp(.42,.72,R()),depth+1,d0+t*len,y0);
        }
      }
      const [tx,ty,tta]=at(1),g=$("g",null,svg),r=R();
      if(depth===0){
        if(r<.72)bloom(g,lerp(32,52,R())*sc,R()<.5?5:6,R()<.6);else daisy(g,lerp(30,42,R())*sc);
        pop(g,y0,d0+len,tx,ty,R()*360,1);
      }else if(depth===1&&r<.4){bloom(g,lerp(18,30,R())*sc,5,R()<.3);pop(g,y0,d0+len,tx,ty,R()*360,1)}
      else if(r<.62){daisy(g,lerp(15,24,R())*sc);pop(g,y0,d0+len,tx,ty,R()*360,1)}
      else if(r<.84){bud(g,lerp(9,14,R())*sc);pop(g,y0,d0+len,tx,ty,tta/D,1)}
      else{berries(g,lerp(12,17,R())*sc);pop(g,y0,d0+len,tx,ty,tta/D,1)}
    };
    const fern=(x,y,ang,len,y0)=>{
      const at=curve(x,y,ang,len,1.5,0,y0),step=11*sc;
      for(let s=step*2;s<len-step;s+=step){
        const t=s/len,[px,py,ta]=at(t),L=lerp(38,7,Math.pow(t,.8))*sc;
        const d="M0 0C"+f(L*.3)+" "+f(-L*.17)+" "+f(L*.8)+" "+f(-L*.13)+" "+f(L)+" 0C"+f(L*.8)+" "+f(L*.13)+" "+f(L*.3)+" "+f(L*.17)+" 0 0Z";
        for(const sg of [1,-1]){const g=$("g",{class:"solid"},svg);$("path",{d},g);$("path",{d:"M0 0L"+f(L*.9)+" 0",class:"hair soft"},g);pop(g,y0,s,px,py,ta/D+sg*62,1)}
      }
      const [tx,ty,tta]=at(1),g=$("g",null,svg);
      $("path",{d:"M0 0c7 -1 12 -6 11 -12c-1 -6 -9 -6 -9 -1c0 3 4 4 5 1",transform:"scale("+f(sc*1.2)+")"},g);
      pop(g,y0,len,tx,ty,tta/D,1);
    };
    const N=Math.ceil(docH/CFG.PLANT_SPACING);
    for(let i=0;i<N;i++){
      const side=(i+(R()<.25?1:0))%2,y=(i+.15+R()*.7)*CFG.PLANT_SPACING,x=side?W+6:-6;
      const ang=(side?Math.PI:0)+(R()-.5)*135*D,len=lerp(140,290,R())*sc;
      if(R()<.27)fern(x,y,ang,len*.9,y);else branch(x,y,ang,len,0,0,y);
    }
  },
  render(p,y){
    const tipY=reduce?1e7:y+H*.9;
    for(const s of this.stems){
      const q=Math.round(c01(((tipY-s.y0)*1.5-s.d0)/s.len)*200)/200;
      if(q===s.last)continue;s.last=q;
      s.el.setAttribute("stroke-dashoffset",f(s.total*(1-q)));s.el.style.visibility=q>0?"visible":"hidden";
    }
    for(const n of this.pops){
      const k=Math.round(ease(((tipY-n.y0)*1.5-n.d)/110)*50)/50;
      if(k===n.k)continue;n.k=k;
      n.el.setAttribute("transform","translate("+f(n.x)+" "+f(n.y)+")rotate("+f(n.rot-(1-k)*45)+")scale("+(Math.round(k*n.s*100)/100)+")");
      n.el.style.visibility=k>0?"visible":"hidden";
    }
  }
};

/* =========================== VEINS: hairline veins that wander across the stone; they run the length of the page and never repeat */
/* hairline veins that wander across the stone; they run the length of the page and never repeat */
const veins={
  build(svg){
    const docH=DOCH;
    svg.setAttribute("viewBox","0 0 "+W+" "+docH);svg.style.height=docH+"px";
    const R=rng(77),D=Math.PI/180,n=Math.ceil(docH/360);
    const walk=(x,y,ang,len,wd,depth)=>{
      let d="M"+f(x)+" "+f(y),gone=0;
      while(gone<len&&x>-60&&x<W+60){
        const st=lerp(14,44,R());ang+=(R()-.5)*(R()<.14?130:44)*D;
        x+=Math.cos(ang)*st;y+=Math.sin(ang)*st*.75;gone+=st;d+="L"+f(x)+" "+f(y);
        if(depth<2&&R()<.13)walk(x,y,ang+(R()<.5?1:-1)*lerp(22,58,R())*D,len*lerp(.2,.45,R()),wd*.6,depth+1);
      }
      $("path",{d,"stroke-width":f(wd)},svg);
    };
    for(let i=0;i<n;i++){
      const left=R()<.5;
      walk(left?-20:W+20,(i+R())*360,(left?0:180)*D+(R()-.5)*70*D,W*lerp(.45,1.25,R()),lerp(.8,1.7,R()),0);
    }
  },
  render(){}
};

/* =========================== engine =========================== */
function start(){
  const root=document.documentElement,body=document.body,wrap=document.querySelector(".wrap")||body;
  let wear=null;
  if(CFG.WEAR_IMAGE){wear=new Image();wear.src=CFG.WEAR_IMAGE;wear.onload=()=>{if(wings.S){wings.paintSprites();wings.sendWear();draw()}}}

  /* the layers, back to front (their stacking order is set in styles.css) */
  const mk=(tag,cls)=>{const e=tag==="svg"?document.createElementNS(NS,"svg"):document.createElement(tag);e.setAttribute("class",cls);e.setAttribute("aria-hidden","true");body.appendChild(e);return e};
  const elGarden=mk("svg","bg-layer bg-garden"),elWear=mk("div","bg-wear"),elWings=mk("div","bg-wings"),elVeins=mk("svg","bg-layer bg-veins"),elTex=mk("div","bg-texture");
  if(!CFG.WEAR_IMAGE)elWear.hidden=true;

  let ys=window.scrollY,raf=0,wingsKey="",pageKey="";
  function draw(){
    const p=reduce?.75:c01(ys/Math.max(1,DOCH-window.innerHeight)),y=reduce?0:ys;
    wings.render(p,y);garden.render(p,y);
  }
  function tick(){
    raf=0;const t=window.scrollY;ys+=(t-ys)*.18;if(Math.abs(t-ys)<.5)ys=t;
    draw();if(ys!==t)raf=requestAnimationFrame(tick);
  }
  function kick(){if(reduce)return;if(!raf)raf=requestAnimationFrame(tick)}
  function build(){
    W=root.clientWidth;H=elWings.getBoundingClientRect().height||window.innerHeight;
    DOCH=Math.ceil(Math.max(H,wrap.offsetTop+wrap.offsetHeight));
    const wk=W+"x"+Math.round(H)+"x"+(window.devicePixelRatio||1),pk=W+"x"+DOCH;
    if(wk!==wingsKey){wingsKey=wk;wings.build(elWings,wear)}
    if(pk!==pageKey){
      pageKey=pk;
      elGarden.textContent="";garden.build(elGarden);
      elVeins.textContent="";veins.build(elVeins);
      elWear.style.height=elTex.style.height=DOCH+"px";
    }
    ys=window.scrollY;draw();
  }
  /* redraw the canvas in the new ink colors when the light/dark theme changes */
  const recolor=()=>{wings.recolor();draw()};
  new MutationObserver(recolor).observe(root,{attributes:true,attributeFilter:["data-site-theme","data-theme"]});
  if(window.matchMedia){const mq=matchMedia("(prefers-color-scheme: dark)");mq.addEventListener?mq.addEventListener("change",recolor):mq.addListener(recolor)}

  window.addEventListener("scroll",kick,{passive:true});
  let rt=0;
  function resized(){clearTimeout(rt);rt=setTimeout(build,150)}
  window.addEventListener("resize",resized);
  if(window.ResizeObserver)new ResizeObserver(resized).observe(wrap);   // the page gets taller as photos load
  build();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
