// =============================================================================
// BIP VIBE SYSTEM — Figma Plugin  v1.2
// Creates 6 × 390×844 vibe frames + 2 verification screens (Manual Review, Suspended)
// Viewing style: dark night-first per src/constants/designTokens.ts BIP_COLORS
// (night #120D1F · deepPlum #24112F · indigo #2B2E59 · paperBeige #E7D8C4 ·
//  moonGold #D5B56B · cloudBlue #98B7D3 · softBerry #9E4D64). Each vibe shares the
// dark room chrome and carries a distinct accent.
// Install: Figma → Plugins → Development → Import plugin from manifest…
//          Select figma/manifest.json, then Run
// =============================================================================

// Dark night-first chrome shared by every vibe (BIP_COLORS). Each vibe differs
// only by accent so the six read as one system in the night room.
const VIBES = {
  raylene: { key:"raylene", label:"Raylene's Room",    bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#D5B56B", accentB:"#9E4D64", accentC:"#E7D8C4", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#D5B56B", glowR:48, isDark:true },
  rylane:  { key:"rylane",  label:"Rylane After Dark", bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#98B7D3", accentB:"#E7D8C4", accentC:"#D5B56B", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#98B7D3", glowR:52, isDark:true },
  cloud:   { key:"cloud",   label:"Cloud Drift",       bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#E7D8C4", accentB:"#98B7D3", accentC:"#F7F2F8", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#98B7D3", glowR:44, isDark:true },
  night:   { key:"night",   label:"Night Comfort",     bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#D5B56B", accentB:"#98B7D3", accentC:"#6A3D63", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#D5B56B", glowR:56, isDark:true },
  rain:    { key:"rain",    label:"Window Rain",       bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#98B7D3", accentB:"#2B2E59", accentC:"#E7D8C4", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#98B7D3", glowR:40, isDark:true },
  sunset:  { key:"sunset",  label:"Sunset Exhale",     bg:"#120D1F", card:"#24112F", cardAlt:"#2B2E59", accentA:"#D5B56B", accentB:"#9E4D64", accentC:"#E7D8C4", textHigh:"#F7F2F8", textMid:"#B8AEC0", textLow:"#7D7288", glowColor:"#D5B56B", glowR:60, isDark:true },
};

const INV = {
  privacy:  { bg:"#1C2433", border:"#98B7D3", text:"#98B7D3" },
  verified: { bg:"#241B2F", text:"#E7D8C4" },
  parent:   { bg:"#2A2016", border:"#D5B56B", text:"#D5B56B" },
};

function h(hex) {
  return { r:parseInt(hex.slice(1,3),16)/255, g:parseInt(hex.slice(3,5),16)/255, b:parseInt(hex.slice(5,7),16)/255 };
}
function solid(hex, a=1) {
  return [{ type:"SOLID", color:h(hex), opacity:a }];
}

function mkFrame(name, x, y, w, hh, bgHex) {
  const f = figma.createFrame();
  f.name=name; f.x=x; f.y=y; f.resize(w,hh);
  f.fills=solid(bgHex); f.clipsContent=true;
  return f;
}

function mkRect(name, x, y, w, hh, bgHex, opacity=1, radius=0) {
  const r=figma.createRectangle();
  r.name=name; r.x=x; r.y=y; r.resize(w,hh);
  r.fills=solid(bgHex,opacity); r.cornerRadius=radius;
  return r;
}

async function mkText(text, x, y, w, size, style, colorHex, name, align="LEFT") {
  await figma.loadFontAsync({family:"Inter",style});
  const t=figma.createText();
  t.name=name; t.characters=text; t.x=x; t.y=y;
  t.fontSize=size; t.fontName={family:"Inter",style};
  t.fills=solid(colorHex);
  t.textAlignHorizontal=align;
  if(w){ t.textAutoResize="HEIGHT"; t.resize(w,t.height); }
  return t;
}

async function scene(parent, v) {
  const bg=mkRect("Scene BG",0,0,390,320,v.cardAlt);
  parent.appendChild(bg);
  const lbl=await mkText("[ Atmosphere — replace with asset ]",20,148,350,13,"Medium",v.textLow,"Scene Label","CENTER");
  parent.appendChild(lbl);
}

async function navBar(parent, v) {
  const nb=mkFrame("Nav Bar",0,0,390,56,v.bg);
  nb.fills=solid(v.bg,0.94);
  const logo=await mkText("bip",20,18,60,20,"Bold",v.accentA,"Logo");
  nb.appendChild(logo);
  const vl=await mkText(v.label,0,20,200,13,"Regular",v.textMid,"Vibe Name","RIGHT");
  vl.x=390-vl.width-20;
  nb.appendChild(vl);
  parent.appendChild(nb);
}

async function heroCard(parent, v) {
  const cf=mkFrame("Hero Card",20,296,350,140,v.card);
  cf.cornerRadius=18;
  cf.strokes=[{type:"SOLID",color:h(v.accentA),opacity:0.18}]; cf.strokeWeight=1;
  cf.effects=[{type:"DROP_SHADOW",color:{...h(v.glowColor),a:0.20},offset:{x:0,y:0},radius:Math.round(v.glowR*0.55),spread:0,visible:true,blendMode:"NORMAL"}];
  const title=await mkText("How are you feeling today?",16,14,318,17,"SemiBold",v.textHigh,"Card Title");
  cf.appendChild(title);
  const body=await mkText("Share what's on your mind, or keep it just for you.",16,40,318,14,"Regular",v.textMid,"Card Body");
  cf.appendChild(body);
  const div=mkRect("Divider",16,92,318,1,v.accentA,0.18);
  cf.appendChild(div);
  const meta=await mkText("Just now · Private",16,102,318,11,"Regular",v.textLow,"Card Meta");
  cf.appendChild(meta);
  parent.appendChild(cf);
}

async function button(parent, label, y, bgHex, textHex, borderHex, name) {
  const bf=mkFrame(name,20,y,350,48,bgHex);
  bf.cornerRadius=999;
  if(borderHex){ bf.strokes=[{type:"SOLID",color:h(borderHex)}]; bf.strokeWeight=1.5; }
  const t=await mkText(label,0,16,350,15,"SemiBold",textHex,"Btn Text","CENTER");
  bf.appendChild(t);
  parent.appendChild(bf);
}

async function inputField(parent, v) {
  const inf=mkFrame("Input Field",20,560,350,48,v.bg);
  inf.cornerRadius=12;
  inf.strokes=[{type:"SOLID",color:h(v.accentA),opacity:0.32}]; inf.strokeWeight=1.5;
  const ph=await mkText("What's on your mind…",14,15,322,15,"Regular",v.textLow,"Placeholder");
  inf.appendChild(ph);
  parent.appendChild(inf);
}

async function badge(parent, label, x, y, bgHex, textHex, borderHex, name) {
  const w=label.length*7.5+24;
  const bf=mkFrame(name,x,y,w,30,bgHex);
  bf.cornerRadius=999;
  if(borderHex){ bf.strokes=[{type:"SOLID",color:h(borderHex)}]; bf.strokeWeight=1.5; }
  const t=await mkText(label,0,9,w,12,"Medium",textHex,"Badge Text","CENTER");
  bf.appendChild(t);
  parent.appendChild(bf);
  return w;
}

async function parentBoundary(parent, v) {
  const pb=mkFrame("Parent Boundary",20,624,350,104,INV.parent.bg);
  pb.cornerRadius=16;
  pb.strokes=[{type:"SOLID",color:h(INV.parent.border)}]; pb.strokeWeight=2;
  const hdr=await mkText("👁  Parent View",12,10,326,12,"SemiBold",INV.parent.text,"PB Header");
  pb.appendChild(hdr);
  const sub=await mkText("Your child's recent activity is summarised here.",12,28,326,12,"Regular",INV.parent.text,"PB Sub");
  pb.appendChild(sub);
  const mini=mkFrame("Mini Card",12,50,326,40,v.card);
  mini.cornerRadius=10;
  const mt=await mkText("Today was a good day…",10,12,306,12,"Regular",v.textMid,"Mini Text");
  mini.appendChild(mt);
  pb.appendChild(mini);
  parent.appendChild(pb);
}

async function journalCard(parent, v) {
  const jf=mkFrame("Journal Card",20,742,350,96,v.card);
  jf.cornerRadius=18;
  jf.strokes=[{type:"SOLID",color:h(v.textHigh),opacity:0.07}]; jf.strokeWeight=1;
  const tt=await mkText("Today was actually pretty good",16,14,318,15,"SemiBold",v.textHigh,"J Title");
  jf.appendChild(tt);
  const dt=await mkText("June 29 · 2:14 PM",16,36,200,11,"Regular",v.textLow,"J Date");
  jf.appendChild(dt);
  const ex=await mkText("I started the morning feeling anxious but after talking I felt much better…",16,52,318,13,"Regular",v.textMid,"J Excerpt");
  jf.appendChild(ex);
  parent.appendChild(jf);
}

async function circleCard(parent, v) {
  const cf=mkFrame("Circle Post Card",20,852,350,112,v.cardAlt);
  cf.cornerRadius=18;
  cf.strokes=[{type:"SOLID",color:h(v.textHigh),opacity:0.06}]; cf.strokeWeight=1;
  const av=figma.createEllipse();
  av.name="Avatar"; av.x=12; av.y=12; av.resize(32,32);
  av.fills=solid(v.accentB);
  cf.appendChild(av);
  const un=await mkText("@sunflower.kid",52,14,250,13,"SemiBold",v.textHigh,"Username");
  cf.appendChild(un);
  const ts=await mkText("3 min ago",52,30,100,11,"Regular",v.textLow,"Timestamp");
  cf.appendChild(ts);
  const po=await mkText("Does anyone use music to calm down before bed? Sharing my playlist 🎵",12,52,326,13,"Regular",v.textMid,"Post Body");
  cf.appendChild(po);
  const rx=await mkText("❤️ 24   💬 8   ✨ 12",12,88,326,11,"Regular",v.textLow,"Reactions");
  cf.appendChild(rx);
  parent.appendChild(cf);
}

async function buildFrame(v, offsetX) {
  const mf=mkFrame(`📱 ${v.key} — ${v.label}`,offsetX,0,390,980,v.bg);
  await scene(mf,v);
  await navBar(mf,v);
  await heroCard(mf,v);
  await button(mf,"Save to Journal",452,v.accentA,v.isDark?v.bg:v.textHigh,null,"Primary Button");
  await button(mf,"Share to Circle",512,v.isDark?v.card:v.bg,v.textHigh,v.accentA,"Secondary Button");
  await inputField(mf,v);
  const pw=await badge(mf,"🔒 Private",20,620,INV.privacy.bg,INV.privacy.text,INV.privacy.border,"Privacy Badge");
  await badge(mf,"✓ Verified",20+pw+10,620,INV.verified.bg,INV.verified.text,null,"Verified Badge");
  await parentBoundary(mf,v);
  await journalCard(mf,v);
  await circleCard(mf,v);
  figma.currentPage.appendChild(mf);
  return mf;
}

// ── Verification terminal-state screens ──────────────────────────────────────
// Dark-first ("/ Night") screens for the two states the route guard redirects to:
// MANUAL_REVIEW → /(safety)/manual-review and SUSPENDED → /(auth)/suspended.
// Frame names match FIGMA_FRAME_SPECS in src/constants/figmaFrames.ts.
const SAFETY = { bg:"#2A1620", text:"#E7D8C4", border:"#9E4D64" };
const VERIFY = [
  {
    frameName:"Bip / Safety / Manual Review / Night", stateKey:"MANUAL_REVIEW",
    route:"/(safety)/manual-review", glyph:"🛟", chip:"Under review",
    title:"We're taking a closer look",
    body:"Your account is in a short safety review. You're safe here — comfort and support stay open the whole time.",
    sections:["What is happening","What stays open","Estimated timing","Reach support"],
    primary:"Talk to support", secondary:"Open Comfort",
  },
  {
    frameName:"Bip / Auth / Suspended / Night", stateKey:"SUSPENDED",
    route:"/(auth)/suspended", glyph:"⏸️", chip:"Suspended",
    title:"Access is paused",
    body:"This account is paused for now. You can open an appeal and a real person will review it with care.",
    sections:["What this means","How to appeal","Support contact","Grounding footer"],
    primary:"Open an appeal", secondary:"Contact support",
  },
];

async function buildVerifyFrame(cfg, offsetX) {
  const v=VIBES.night;
  const mf=mkFrame(cfg.frameName,offsetX,0,390,844,v.bg);

  const nb=mkFrame("Nav Bar",0,0,390,56,v.bg); nb.fills=solid(v.bg,0.94);
  const logo=await mkText("bip",20,18,60,20,"Bold",v.accentA,"Logo"); nb.appendChild(logo);
  const sk=await mkText(cfg.stateKey,0,20,220,12,"Medium",v.textLow,"State Key","RIGHT");
  sk.x=390-sk.width-20; nb.appendChild(sk);
  mf.appendChild(nb);

  const art=mkRect("Status Art",20,96,350,150,v.card,1,20);
  art.strokes=[{type:"SOLID",color:h(v.accentA),opacity:0.18}]; art.strokeWeight=1;
  mf.appendChild(art);
  const glyph=await mkText(cfg.glyph,0,148,390,56,"Regular",v.textHigh,"Glyph","CENTER");
  mf.appendChild(glyph);

  await badge(mf,cfg.chip,20,268,SAFETY.bg,SAFETY.text,SAFETY.border,"Status Chip");

  const title=await mkText(cfg.title,20,314,350,24,"SemiBold",v.textHigh,"Title");
  mf.appendChild(title);
  const body=await mkText(cfg.body,20,352,350,15,"Regular",v.textMid,"Body");
  mf.appendChild(body);

  const cardH=24+cfg.sections.length*30;
  const sc=mkFrame("Sections",20,430,350,cardH,v.card); sc.cornerRadius=16;
  sc.strokes=[{type:"SOLID",color:h(v.textHigh),opacity:0.07}]; sc.strokeWeight=1;
  let sy=14;
  for(const s of cfg.sections){
    const row=await mkText("•  "+s,16,sy,318,14,"Regular",v.textMid,"Section "+s);
    sc.appendChild(row); sy+=30;
  }
  mf.appendChild(sc);

  await button(mf,cfg.primary,672,v.accentA,v.bg,null,"Primary Button");
  await button(mf,cfg.secondary,728,v.card,v.textHigh,v.accentA,"Secondary Button");
  const rt=await mkText("route → "+cfg.route,0,792,390,11,"Regular",v.textLow,"Route","CENTER");
  mf.appendChild(rt);

  figma.currentPage.appendChild(mf);
  return mf;
}

(async () => {
  try {
    const order=["raylene","rylane","cloud","night","rain","sunset"];
    const frames=[];
    for(let i=0;i<order.length;i++){
      frames.push(await buildFrame(VIBES[order[i]],i*440));
    }
    for(let i=0;i<VERIFY.length;i++){
      frames.push(await buildVerifyFrame(VERIFY[i],(order.length+i)*440));
    }
    figma.viewport.scrollAndZoomIntoView(frames);
    figma.notify("✅ 6 vibe + 2 verification frames created!",{timeout:4000});
  } catch(e) {
    figma.notify("❌ "+e.message,{timeout:8000,error:true});
    console.error(e);
  } finally {
    figma.closePlugin();
  }
})();
