const defaults={enabled:true,targetLang:"fa",twitchEnabled:true,kickEnabled:true};const $=id=>document.getElementById(id);async function load(){const s=await chrome.storage.sync.get(defaults);$("enabled").checked=!!s.enabled;$("targetLang").value=s.targetLang||"fa";$("twitchEnabled").checked=!!s.twitchEnabled;$("kickEnabled").checked=!!s.kickEnabled;render()}function render(){const on=$("enabled").checked;$("statusText").textContent=on?"فعال":"خاموش";$("statusDot").classList.toggle("on",on)}async function save(){await chrome.storage.sync.set({enabled:$("enabled").checked,targetLang:$("targetLang").value,twitchEnabled:$("twitchEnabled").checked,kickEnabled:$("kickEnabled").checked});render()}["enabled","targetLang","twitchEnabled","kickEnabled"].forEach(id=>$(id).addEventListener("change",save));load();
async function loadDebug(){
  try{
    const r=await chrome.runtime.sendMessage({type:"GET_DEBUG"});
    const s=r?.stats||{};
    const c=await chrome.storage.local.get({contentDebug:null});
    const cs=c.contentDebug||{};
    const detected=cs.detected||0;
    const sent=cs.sent||0;
    const success=Math.max(s.success||0,cs.success||0);
    const fail=(s.fail||0)+(cs.fail||0);
    ["detected","sent","success","fail"].forEach(k=>$(k).textContent=({detected,sent,success,fail})[k]);
    const err=s.lastError||cs.lastError;
    $("debugError").textContent=err?("آخرین خطا: "+err):"خطایی ثبت نشده";
  }catch(e){$("debugError").textContent="Debug unavailable: "+e.message}
}
$("resetDebug").addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"DEBUG_RESET"});loadDebug()});
loadDebug();
setInterval(loadDebug,1000);

async function loadContentState(){
  const x=await chrome.storage.local.get({contentState:null});
  const s=x.contentState;
  if(!s){$("contentState").textContent="صفحه Twitch/Kick شناسایی نشده";return}
  const age=Math.round((Date.now()-(s.lastReportAt||s.loadedAt||Date.now()))/1000);
  $("contentState").textContent="Content: "+s.platform+" ✓ | پیام: "+(s.detected||0)+" | "+(age<10?"فعال":"قدیمی");
}
$("testBing").addEventListener("click",async()=>{
  $("testBing").disabled=true;
  $("debugError").textContent="در حال تست Bing…";
  try{
    const r=await chrome.runtime.sendMessage({type:"TRANSLATE",text:"Hello, this is a Bing Translator test."});
    $("debugError").textContent=r?.ok?"Bing OK: "+r.translated:"Bing ERROR: "+(r?.error||"unknown error");
    loadDebug();
  }catch(e){$("debugError").textContent="Bing ERROR: "+e.message}
  finally{$("testBing").disabled=false}
});
loadContentState();
setInterval(loadContentState,1000);
