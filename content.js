(()=>{
const host=location.hostname,twitch=host.includes("twitch.tv"),kick=host.includes("kick.com");
if(!twitch&&!kick)return;
const done=new WeakSet(),queue=[];let running=0,enabled=true,platformEnabled=true;const MAX=2;
const debug={detected:0,sent:0,success:0,fail:0,lastText:"",lastError:""};
async function report(){
  try{await chrome.runtime.sendMessage({type:"CONTENT_DEBUG",stats:{...debug,platform:twitch?"twitch":"kick"}})}catch(e){debug.fail++;debug.lastError=e?.message||String(e);report()}
}

const norm=s=>String(s||"").replace(/\s+/g," ").trim();
async function load(){const s=await chrome.storage.sync.get({enabled:true,twitchEnabled:true,kickEnabled:true});enabled=s.enabled;platformEnabled=twitch?s.twitchEnabled:s.kickEnabled}
load();
chrome.storage.onChanged.addListener((c,a)=>{if(a!=="sync")return;if(c.enabled)enabled=!!c.enabled.newValue;if(twitch&&c.twitchEnabled)platformEnabled=!!c.twitchEnabled.newValue;if(kick&&c.kickEnabled)platformEnabled=!!c.kickEnabled.newValue});
function shouldTranslate(t){if(!t||t.length<3||t.length>1000)return false;if(/^(lol+|lmao+|haha+|gg|wp|glhf|xd|xD|:d|❤️|❤)$/i.test(t))return false;return t.replace(/[^A-Za-z\u0600-\u06FF\u00C0-\u024F]/g,"").length>=3}
function textOf(n){
  if(twitch){const b=n.querySelector('[data-a-target="chat-line-message-body"],.chat-line__message--body');if(b)return norm(b.innerText)}
  if(kick){const els=n.querySelectorAll('[data-testid*="message"],[data-testid*="chat-message"],[class*="chat-message"],[class*="chatMessage"],[class*="ChatMessage"],[class*="message-content"],[class*="MessageContent"]');for(const e of els){const t=norm(e.innerText);if(t)return t}}
  const c=n.cloneNode(true);c.querySelectorAll("button,img,svg,[data-translated-by-extension],[aria-hidden=true]").forEach(e=>e.remove());return norm(c.innerText)
}
function add(t){const b=document.createElement("div");b.dataset.translatedByExtension="1";b.textContent="↳ "+t;b.style.cssText="margin-top:2px;padding:2px 0;font-size:.92em;line-height:1.3;opacity:.82;direction:rtl;unicode-bidi:plaintext;white-space:pre-wrap";return b}
async function process(x){const {node,text}=x;if(!node.isConnected||done.has(node))return;done.add(node);try{debug.sent++;
    const r=await chrome.runtime.sendMessage({type:"TRANSLATE",text});if(!r?.ok){debug.fail++;debug.lastError=r?.error||"unknown error";return;}
    if(!node.isConnected)return;const target=twitch?(node.querySelector('[data-a-target="chat-line-message-body"],.chat-line__message--body')||node):node;if(target.querySelector?.('[data-translated-by-extension]'))return;target.appendChild(add(r.translated));debug.success++;report()}catch(_){}}
function pump(){while(running<MAX&&queue.length){running++;process(queue.shift()).finally(()=>{running--;pump()})}}
function inspect(n){if(!enabled||!platformEnabled||!(n instanceof Element)||n.hasAttribute("data-translated-by-extension"))return;const t=textOf(n);if(!shouldTranslate(t))return;if(n.children.length>60&&!n.matches('[data-a-target="chat-line-message"],.chat-line__message'))return;debug.detected++;
  debug.lastText=t.slice(0,120);
  queue.push({node:n,text:t});pump()}
function scan(r){if(!(r instanceof Element))return;inspect(r);r.querySelectorAll?.(twitch?'[data-a-target="chat-line-message"],.chat-line__message':'[data-testid*="message"],[data-testid*="chat-message"],[class*="chat-message"],[class*="chatMessage"],[class*="ChatMessage"],[class*="message-content"],[class*="MessageContent"]').forEach(inspect)}
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(scan))).observe(document.documentElement,{childList:true,subtree:true});
setInterval(report,3000);
scan(document.body);
report();
})();