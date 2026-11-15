/* The scroll-driven background on every page:
     - a pair of wings (with a flock of swallows above them) that stays in place and opens as you scroll
     - a wild garden of sprigs, ferns and flowers that grows in from the page edges as you reach it
     - a stone surface with hairline veins
   Everything is drawn by this file, so there are no image files to manage.
   The look (colors and strengths) is set in styles.css under "Scroll background".

   ===== SETTINGS: edit here ===== */
var BACKGROUND = {
  SHOW: true,          // false turns the whole background off
  WEAR: 0.6,           // how worn/patchy the drawn lines are: 0 = clean lines, 1 = very worn
  PLANT_SPACING: 440,  // average distance down the page between plants (bigger = fewer plants)
  PAPER: { light: "#f3f5f7", dark: "#0e1a2a" }   // must match --paper in styles.css (light and dark)
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
function feather(parent,L,w,cls){
  const g=$("g",{class:cls||"solid"},parent);
  $("path",{d:featherD(L,w)},g);
  $("path",{d:"M0 0L"+f(L*.95)+" 0",class:"hair soft"},g);
  return g;
}
/* =========================== WINGS: fixed behind the page, open as you scroll =========================== */
const wings={
  build(svg){
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    const u=this.u=Math.min(W*0.5,800)/1.36;
    /* loose feathers that drift down the page */
    this.fall=[];const R=rng(11);
    for(let i=0;i<9;i++){
      const d=lerp(.45,1,R()),g=feather(svg,lerp(26,54,d),lerp(4,8,d),i%4===0?"acc solid":"solid");
      this.fall.push({g,x:R()*W,y0:R()*(H+240),d,ph:R()*6.28});
    }
    const root=this.root=$("g",null,svg);
    this.fe=[];this.bones=[];
    const rows=[{n:17,l0:.27,l1:.58,w:.1,da:0},{n:14,l0:.16,l1:.28,w:.15,da:-8},{n:12,l0:.085,l1:.14,w:.2,da:-14}];
    for(const side of [1,-1]){
      const wg=$("g",{transform:"scale("+side+" 1)"},root);
      rows.forEach(r=>{
        for(let i=0;i<r.n;i++){           /* tip first, so inner feathers overlap outer ones */
          const t=1-(i+.5)/r.n;
          let L=u*lerp(r.l0,r.l1,t);if(t>.86)L*=1-(t-.86)*1.6;
          this.fe.push({g:feather(wg,L,L*r.w),t,da:r.da});
        }
      });
      this.bones.push($("path",{"stroke-width":1.6},wg));
    }
    /* a flock above the wings: each bird stays put but grows in, one after another, as you scroll */
    this.birds=[];
    const flock=[[0,.5,.15,0],[-27,.6,.115,.07],[25,.66,.125,.13],[-52,.55,.1,.19],[50,.52,.105,.25],[-10,.82,.095,.31],[14,.92,.08,.37],[-40,.82,.085,.43],[38,.8,.09,.49],[-66,.68,.075,.54],[64,.7,.075,.58]];
    flock.forEach((b,i)=>{
      const g=$("g",{class:i===0?"bird acc solid":"bird solid"},root),wl=$("g",null,g),wr=$("g",null,g);
      for(const w of [wl,wr]){
        $("path",{d:"M.06 -.32C.42 -.46 .8 -.22 1.1 .28C.78 .08 .46 .04 .06 .12Z"},w);
        $("path",{d:"M.2 -.22C.48 -.22 .74 -.04 .96 .18M.18 -.06C.38 -.08 .56 -.02 .72 .06",class:"hair"},w);
      }
      $("path",{d:"M-.07 .28L-.22 .9L0 .58L.22 .9L.07 .28Z"},g);
      $("path",{d:"M0 -.62L.05 -.5C.13 -.42 .15 -.1 .08 .26L0 .46L-.08 .26C-.15 -.1 -.13 -.42 -.05 -.5Z"},g);
      this.birds.push({g,wl,wr,a:b[0]*.01745,r:b[1],s:Math.max(13,b[2]*u),t:b[3],head:b[0]*.75+(i%3-1)*7,k:-1});
    });
  },
  render(p,y){
    const u=this.u,o=lerp(.2,1,ease(p*1.2));
    this.root.setAttribute("transform","translate("+f(W/2)+" "+f(H*lerp(.6,.47,ease(p)))+")");
    const p1x=lerp(.14,.42,o)*u,p1y=lerp(-.24,-.38,o)*u,p2x=lerp(.2,.9,o)*u,p2y=lerp(.36,.0,o)*u;
    for(const q of this.fe){
      const t=q.t,x=2*(1-t)*t*p1x+t*t*p2x,yy=2*(1-t)*t*p1y+t*t*p2y;
      const ang=lerp(lerp(93,80,t),lerp(100,20,t),o)+q.da*o;
      q.g.setAttribute("transform","translate("+f(x)+" "+f(yy)+")rotate("+f(ang)+")");
    }
    const d="M0 0Q"+f(p1x)+" "+f(p1y)+" "+f(p2x)+" "+f(p2y);
    this.bones[0].setAttribute("d",d);this.bones[1].setAttribute("d",d);
    this.birds.forEach((b,i)=>{
      const k=Math.round(ease((p-b.t)/.3)*100)/100,fl=f(.78+.22*Math.sin(y*.02+i*1.7));
      b.wr.setAttribute("transform","scale("+fl+" 1)");b.wl.setAttribute("transform","scale(-"+fl+" 1)");
      if(k===b.k)return;b.k=k;
      const r=u*b.r*(.6+.4*k);
      b.g.setAttribute("transform","translate("+f(Math.sin(b.a)*r)+" "+f(-Math.cos(b.a)*r)+")rotate("+f(b.head)+")scale("+f(k*b.s)+")");
      b.g.style.visibility=k>0?"visible":"hidden";
    });
    const span=H+240;
    for(const q of this.fall){
      const yy=((q.y0+y*.32*q.d)%span+span)%span-120,xx=q.x+Math.sin(y*.003+q.ph)*46*q.d;
      q.g.setAttribute("transform","translate("+f(xx)+" "+f(yy)+")rotate("+f(72+Math.sin(y*.004+q.ph)*42)+")");
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

/* =========================== STONE: marbled, pitted, flecked rock laid over the drawings, plus hairline veins =========================== */
function stoneTile(dark){
  const k=dark?"0 0 0 0 1 0 0 0 0 1 0 0 0 0 1":"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0";
  const mottle=k+" -1.5 0 0 0 .5",fleck=k+" 5 0 0 0 -3.05";
  const relief=k+(dark?" 1.9 0 0 0 -1.6":" -1.9 0 0 0 1.62");
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+
    '<filter id="m" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" color-interpolation-filters="sRGB">'+
      '<feTurbulence type="turbulence" baseFrequency=".0065 .008" numOctaves="6" seed="'+(dark?6:3)+'" stitchTiles="stitch"/><feColorMatrix type="matrix" values="'+mottle+'"/></filter>'+
    '<filter id="r" filterUnits="userSpaceOnUse" x="-64" y="-64" width="640" height="640" color-interpolation-filters="sRGB">'+
      '<feTurbulence type="turbulence" baseFrequency=".032" numOctaves="5" seed="'+(dark?9:4)+'" stitchTiles="stitch" x="0" y="0" width="512" height="512"/><feTile/>'+
      '<feDiffuseLighting surfaceScale="1.9" diffuseConstant="1" lighting-color="#fff"><feDistantLight azimuth="235" elevation="58"/></feDiffuseLighting>'+
      '<feColorMatrix type="matrix" values="'+relief+'"/></filter>'+
    '<filter id="s" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" color-interpolation-filters="sRGB">'+
      '<feTurbulence type="fractalNoise" baseFrequency=".83 .91" numOctaves="3" seed="11" stitchTiles="stitch"/><feColorMatrix type="matrix" values="'+fleck+'"/></filter>'+
    '<rect width="512" height="512" filter="url(#m)" opacity=".5"/>'+
    '<rect x="-64" y="-64" width="640" height="640" filter="url(#r)" opacity=".55"/>'+
    '<rect width="512" height="512" filter="url(#s)" opacity=".35"/></svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
}

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

/* =========================== WEAR: gaps, faded patches and fine pitting in the drawn lines ===========================
   Three layers of noise multiplied together. With no color it is a mask (used on the wings);
   with a color it is a tile of stone-colored blotches laid over the garden, which looks the same. */
function wearTile(w,color){
  const m=v=>"0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 "+v;
  let paint="";
  if(color){
    const c=[1,3,5].map(i=>(parseInt(color.slice(i,i+2),16)/255).toFixed(3));
    paint='<feColorMatrix type="matrix" values="0 0 0 0 '+c[0]+" 0 0 0 0 "+c[1]+" 0 0 0 0 "+c[2]+' 0 0 0 -1 1"/>';
  }
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">'+
    '<filter id="w" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="512" color-interpolation-filters="sRGB">'+
      '<feTurbulence type="fractalNoise" baseFrequency=".021 .027" numOctaves="3" seed="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="'+m("25 0 0 0 "+(-25*(.25+.12*w)).toFixed(2))+'" result="gaps"/>'+
      '<feTurbulence type="fractalNoise" baseFrequency=".0055" numOctaves="2" seed="8" stitchTiles="stitch"/><feColorMatrix type="matrix" values="'+m((3*w).toFixed(2)+" 0 0 0 "+(1-1.5*w).toFixed(2))+'" result="fade"/>'+
      '<feTurbulence type="fractalNoise" baseFrequency=".55" numOctaves="1" seed="5" stitchTiles="stitch"/><feColorMatrix type="matrix" values="'+m("10 0 0 0 "+(-10*(.2+.1*w)).toFixed(2))+'" result="pits"/>'+
      '<feComposite in="gaps" in2="fade" operator="in"/><feComposite in2="pits" operator="in"/>'+paint+'</filter>'+
    '<rect width="512" height="512" filter="url(#w)"/></svg>';
  return 'url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
}

/* =========================== engine =========================== */
function start(){
  const root=document.documentElement,body=document.body,wrap=document.querySelector(".wrap")||body;
  const set=(k,v)=>root.style.setProperty(k,v);
  set("--tex-l",stoneTile(false));set("--tex-d",stoneTile(true));
  const wear=Math.max(0,Math.min(1,+CFG.WEAR||0));
  if(wear>0){set("--wear-mask",wearTile(wear));set("--wear-l",wearTile(wear,CFG.PAPER.light));set("--wear-d",wearTile(wear,CFG.PAPER.dark))}

  /* the layers, back to front (their stacking order is set in styles.css) */
  const mk=(svg,cls)=>{const e=svg?document.createElementNS(NS,"svg"):document.createElement("div");e.setAttribute("class",cls);e.setAttribute("aria-hidden","true");body.appendChild(e);return e};
  const elGarden=mk(true,"bg-layer bg-garden"),elWear=mk(false,"bg-wear"),elWings=mk(true,"bg-layer bg-wings"),elVeins=mk(true,"bg-layer bg-veins"),elTex=mk(false,"bg-texture");

  let ys=window.scrollY,raf=0,wingsKey="",pageKey="";
  function draw(){
    const p=reduce?.75:c01(ys/Math.max(1,DOCH-window.innerHeight)),y=reduce?0:ys;
    wings.render(p,y);garden.render(p,y);
  }
  function tick(){
    raf=0;const t=window.scrollY;ys+=(t-ys)*.14;if(Math.abs(t-ys)<.4)ys=t;
    draw();if(ys!==t)raf=requestAnimationFrame(tick);
  }
  function kick(){if(reduce)return;if(!raf)raf=requestAnimationFrame(tick)}
  function build(){
    W=root.clientWidth;H=elWings.getBoundingClientRect().height||window.innerHeight;
    DOCH=Math.ceil(Math.max(H,wrap.offsetTop+wrap.offsetHeight));
    const wk=W+"x"+Math.round(H),pk=W+"x"+DOCH;
    if(wk!==wingsKey){wingsKey=wk;elWings.textContent="";wings.build(elWings)}
    if(pk!==pageKey){
      pageKey=pk;
      elGarden.textContent="";garden.build(elGarden);
      elVeins.textContent="";veins.build(elVeins);
      elWear.style.height=elTex.style.height=DOCH+"px";
    }
    ys=window.scrollY;draw();
  }
  window.addEventListener("scroll",kick,{passive:true});
  let rt=0;
  function resized(){clearTimeout(rt);rt=setTimeout(build,150)}
  window.addEventListener("resize",resized);
  if(window.ResizeObserver)new ResizeObserver(resized).observe(wrap);   // the page gets taller as photos load
  build();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
