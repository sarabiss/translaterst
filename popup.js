const defaults={enabled:true,targetLang:"fa",twitchEnabled:true,kickEnabled:true};const $=id=>document.getElementById(id);async function load(){const s=await chrome.storage.sync.get(defaults);$("enabled").checked=!!s.enabled;$("targetLang").value=s.targetLang||"fa";$("twitchEnabled").checked=!!s.twitchEnabled;$("kickEnabled").checked=!!s.kickEnabled;render()}function render(){const on=$("enabled").checked;$("statusText").textContent=on?"فعال":"خاموش";$("statusDot").classList.toggle("on",on)}async function save(){await chrome.storage.sync.set({enabled:$("enabled").checked,targetLang:$("targetLang").value,twitchEnabled:$("twitchEnabled").checked,kickEnabled:$("kickEnabled").checked});render()}["enabled","targetLang","twitchEnabled","kickEnabled"].forEach(id=>$(id).addEventListener("change",save));load();
async function loadDebug(){
  try{
    const r=await chrome.runtime.sendMessage({type:"GET_DEBUG"});
    const s=r?.stats||{};
    ["detected","sent","success","fail"].forEach(k=>$(k).textContent=s[k]||0);
    $("debugError").textContent=s.lastError?("آخرین خطا: "+s.lastError):"خطایی ثبت نشده";
  }catch(e){$("debugError").textContent="Debug unavailable: "+e.message}
}
$("resetDebug").addEventListener("click",async()=>{await chrome.runtime.sendMessage({type:"DEBUG_RESET"});loadDebug()});
loadDebug();
setInterval(loadDebug,1000);
