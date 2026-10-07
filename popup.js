const defaults={enabled:true,twitchEnabled:true,kickEnabled:true,selectedPlatform:"auto"};
const $=id=>document.getElementById(id);
async function load(){const s=await chrome.storage.sync.get(defaults);$("enabled").checked=!!s.enabled;$("twitchEnabled").checked=!!s.twitchEnabled;$("kickEnabled").checked=!!s.kickEnabled;$("selectedPlatform").value=s.selectedPlatform||"auto";render();}
function render(){const on=$("enabled").checked;$("statusText").textContent=on?"فعال":"خاموش";$("statusDot").classList.toggle("on",on);}
async function save(){await chrome.storage.sync.set({enabled:$("enabled").checked,targetLang:"fa",twitchEnabled:$("twitchEnabled").checked,kickEnabled:$("kickEnabled").checked,selectedPlatform:$("selectedPlatform").value});render();}
["enabled","twitchEnabled","kickEnabled","selectedPlatform"].forEach(id=>$(id).addEventListener("change",save));
load();

async function injectCurrentTab(){
  $("inject").disabled=true;
  $("contentState").textContent="در حال اجرای مترجم روی صفحه…";
  try{
    const tabs=await chrome.tabs.query({active:true,currentWindow:true});
    const tab=tabs[0];
    if(!tab?.id)throw new Error("تب فعال پیدا نشد");
    const selected=$("selectedPlatform").value||"auto";
    if(selected==="auto" && !/twitch\\.tv|kick\\.com/i.test(tab.url||"")) throw new Error("لطفاً Twitch یا Kick را دستی انتخاب کن");
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:["content.js"]});
    setTimeout(loadContentState,500);
  }catch(e){
    $("contentState").textContent="اجرای مترجم ناموفق: "+e.message;
  }finally{$("inject").disabled=false;}
}
$("inject").addEventListener("click",injectCurrentTab);

async function loadDebug(){
  try{
    const r=await chrome.runtime.sendMessage({type:"GET_DEBUG"});
    const s=r?.stats||{};
    const c=await chrome.storage.local.get({contentDebug:null});
    const cs=c.contentDebug||{};
    const detected=cs.detected||0,sent=cs.sent||0,success=Math.max(s.success||0,cs.success||0),fail=(s.fail||0)+(cs.fail||0);
    ["detected","sent","success","fail"].forEach(k=>$(k).textContent=({detected,sent,success,fail})[k]);
    const err=s.lastError||cs.lastError;$("debugError").textContent=err?("آخرین خطا: "+err):"خطایی ثبت نشده";
  }catch(e){$("debugError").textContent="Debug unavailable: "+e.message;}
}
$("resetDebug").addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"DEBUG_RESET"});loadDebug();});
$("testBing").addEventListener("click",async()=>{$("testBing").disabled=true;$("debugError").textContent="در حال تست Bing…";try{const r=await chrome.runtime.sendMessage({type:"TRANSLATE",text:"Hello, this is a Bing Translator test."});$("debugError").textContent=r?.ok?"Bing OK: "+r.translated:"Bing ERROR: "+(r?.error||"unknown error");loadDebug();}catch(e){$("debugError").textContent="Bing ERROR: "+e.message;}finally{$("testBing").disabled=false;}});
async function loadContentState(){const x=await chrome.storage.local.get({contentState:null});const s=x.contentState;if(!s){$("contentState").textContent="صفحه Twitch/Kick شناسایی نشده";return;}const age=Math.round((Date.now()-(s.lastReportAt||s.loadedAt||Date.now()))/1000);$("contentState").textContent="Content: "+s.platform+" ✓ | پیام: "+(s.detected||0)+" | "+(age<10?"فعال":"قدیمی");}
loadDebug();loadContentState();setInterval(loadDebug,1000);setInterval(loadContentState,1000);