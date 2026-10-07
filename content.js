(async()=>{
const host=location.hostname;
const autoTwitch=host.includes("twitch.tv");
const autoKick=host.includes("kick.com");

let selectedPlatform=null;
try{
  const saved=await chrome.storage.sync.get({selectedPlatform:"auto"});
  selectedPlatform=saved.selectedPlatform||"auto";
}catch{}

const twitch=selectedPlatform==="twitch" || (selectedPlatform==="auto" && autoTwitch);
const kick=selectedPlatform==="kick" || (selectedPlatform==="auto" && autoKick);
if(!twitch&&!kick)return;

const PLATFORM=twitch?"twitch":"kick";
const state={platform:PLATFORM,host,url:location.href,loadedAt:Date.now(),detected:0,sent:0,success:0,fail:0,lastText:"",lastError:""};
const done=new WeakSet(),queue=[];
let running=0,enabled=true,platformEnabled=true;
const MAX=2;

async function report(){
  try{
    await chrome.storage.local.set({contentState:{...state,lastReportAt:Date.now()}});
    await chrome.runtime.sendMessage({type:"CONTENT_DEBUG",stats:{...state,lastReportAt:Date.now()}});
  }catch(e){state.lastError=e?.message||String(e)}
}

function badge(){
  const old=document.getElementById("chat-translator-debug-badge");
  if(old)old.remove();
  const b=document.createElement("div");
  b.id="chat-translator-debug-badge";
  b.textContent="Translator ✓ "+PLATFORM;
  b.style.cssText="position:fixed;z-index:2147483647;left:10px;bottom:10px;padding:5px 9px;border-radius:8px;background:#111827;color:#86efac;font:11px Arial,sans-serif;box-shadow:0 2px 10px #0008;pointer-events:none;opacity:.9";
  (document.body||document.documentElement).appendChild(b);
}

const norm=s=>String(s||"").replace(/\s+/g," ").trim();

async function load(){
  const s=await chrome.storage.sync.get({enabled:true,twitchEnabled:true,kickEnabled:true});
  enabled=!!s.enabled;
  platformEnabled=twitch?!!s.twitchEnabled:!!s.kickEnabled;
  report();
}
load();

chrome.storage.onChanged.addListener((c,a)=>{
  if(a!=="sync")return;
  if(c.enabled)enabled=!!c.enabled.newValue;
  if(twitch&&c.twitchEnabled)platformEnabled=!!c.twitchEnabled.newValue;
  if(kick&&c.kickEnabled)platformEnabled=!!c.kickEnabled.newValue;
});

function shouldTranslate(t){
  if(!t||t.length<3||t.length>1000)return false;
  if(/^(lol+|lmao+|haha+|gg|wp|glhf|xd|xD|:d|❤️|❤)$/i.test(t))return false;
  return t.replace(/[^A-Za-z\u0600-\u06FF\u00C0-\u024F]/g,"").length>=3;
}

/*
 * فقط متن واقعی پیام را برمی‌گرداند.
 * timestamp / username / badge / buttons / عناصر ترجمه قبلی
 * نباید وارد متن ارسالی به Bing شوند.
 */
function cleanMessageElement(el){
  if(!el)return "";
  const c=el.cloneNode(true);
  c.querySelectorAll(
    '[data-translated-by-extension]',
    'button','img','svg',
    '[aria-hidden="true"]',
    '[data-testid*="timestamp"]',
    '[data-testid*="username"]',
    '[data-testid*="user"]',
    '[class*="timestamp"]',
    '[class*="time"]',
    '[class*="username"]',
    '[class*="user-name"]',
    '[class*="userName"]',
    '[class*="message-author"]',
    '[class*="author"]',
    '[class*="badge"]',
    '[class*="emote"]'
  ).forEach(e=>e.remove());
  return norm(c.innerText||c.textContent);
}

function textOf(n){
  if(twitch){
    const b=n.matches?.('[data-a-target="chat-line-message-body"],.chat-line__message--body')
      ? n : n.querySelector?.('[data-a-target="chat-line-message-body"],.chat-line__message--body');
    if(b)return cleanMessageElement(b);
  }

  if(kick){
    const direct=n.matches?.('[data-index]') ? n : n.querySelector?.('[data-index]');
    if(direct){
      const body=direct.querySelector(
        '.break-words,.message-text,[class*="message-text"],[class*="break-words"]'
      );
      if(body){
        const t=cleanMessageElement(body);
        if(t)return t;
      }

      // fallback: از خود ردیف پیام metadata را حذف کن
      const t=cleanMessageElement(direct);
      if(t)return t;
    }

    const els=n.querySelectorAll?.(
      '[data-testid*="message"],[data-testid*="chat-message"],[data-message-id],.chat-message,.chat-line,[class*="chat-message"],[class*="chatMessage"]'
    )||[];
    for(const e of els){
      const t=cleanMessageElement(e);
      if(t)return t;
    }
  }

  const c=n.cloneNode(true);
  c.querySelectorAll("button,img,svg,[data-translated-by-extension],[aria-hidden=true]").forEach(e=>e.remove());
  return norm(c.innerText||c.textContent);
}

function add(t){
  const b=document.createElement("div");
  b.dataset.translatedByExtension="1";
  b.lang="fa";
  b.dir="rtl";
  b.textContent=t;
  b.style.cssText=[
    "display:block",
    "width:100%",
    "box-sizing:border-box",
    "margin-top:5px",
    "padding:6px 9px",
    "border-right:3px solid #8b5cf6",
    "border-radius:5px",
    "background:rgba(139,92,246,.08)",
    "color:#f1f5f9",
    "font-family:Tahoma,Arial,sans-serif",
    "font-size:14px",
    "font-weight:500",
    "line-height:1.8",
    "text-align:right",
    "direction:rtl",
    "unicode-bidi:plaintext",
    "white-space:pre-wrap",
    "word-break:normal",
    "overflow-wrap:anywhere"
  ].join(";");
  return b;
}

async function process(x){
  const {node,text}=x;
  if(!node.isConnected||done.has(node))return;
  done.add(node);
  try{
    state.sent++;
    const r=await chrome.runtime.sendMessage({type:"TRANSLATE",text});
    if(!r?.ok){
      state.fail++;
      state.lastError=r?.error||"unknown error";
      report();
      return;
    }
    if(!node.isConnected)return;
    let target;
    if(twitch){
      target=node.querySelector?.('[data-a-target="chat-line-message-body"],.chat-line__message--body')||node;
    }else{
      target=node.querySelector?.('.break-words,.message-text,[class*="message-text"],[class*="break-words"]')||node;
    }
    if(target.querySelector?.('[data-translated-by-extension]'))return;
    target.appendChild(add(r.translated));
    state.success++;
    report();
  }catch(e){
    state.fail++;
    state.lastError=e?.message||String(e);
    report();
  }
}

function pump(){
  while(running<MAX&&queue.length){
    running++;
    process(queue.shift()).finally(()=>{running--;pump()});
  }
}

function inspect(n){
  if(!enabled||!platformEnabled||!(n instanceof Element)||n.hasAttribute("data-translated-by-extension"))return;
  const t=textOf(n);
  if(!shouldTranslate(t))return;
  if(twitch && n.children.length>60 && !n.matches('[data-a-target="chat-line-message"],.chat-line__message'))return;
  state.detected++;
  state.lastText=t.slice(0,120);
  queue.push({node:n,text:t});
  pump();
}

const twitchRows='[data-a-target="chat-line-message"],.chat-line__message';
const kickRows='#chatroom-messages > div > [data-index],#chatroom-messages [data-index],[data-message-id],.chat-message,.chat-line';

function scan(root){
  if(!(root instanceof Element))return;
  inspect(root);
  root.querySelectorAll?.(twitch?twitchRows:kickRows).forEach(inspect);
}

function startObserver(){
  const root=document.documentElement;
  new MutationObserver(ms=>{
    for(const m of ms){
      for(const n of m.addedNodes)scan(n);
    }
  }).observe(root,{childList:true,subtree:true});
  scan(root);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{badge();startObserver();report()});
else{badge();startObserver();report()}
setInterval(report,3000);
})();