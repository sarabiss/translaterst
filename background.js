const BING={base:"https://www.bing.com/ttranslatev3",tokenPage:"https://www.bing.com/translator"};
let bingToken=null,translateCount=0;
const cache=new Map();

function parseTokenPage(html){
  const ig=html.match(/IG:"([^"]+)"/i)||html.match(/"ig":"([^"]+)"/i);
  const iid=html.match(/data-iid="([^"]+)"/i)||html.match(/data-iid='([^']+)'/i);
  const helper=html.match(/params_AbusePreventionHelper\s*=\s*([^\]]+\])/i)||html.match(/params_AbusePreventionHelper\s*:\s*([^\]]+\])/i);
  if(!ig||!iid||!helper)throw new Error("Bing credentials not found");
  let a;
  try{a=JSON.parse(helper[1])}catch{a=JSON.parse("["+helper[1]+"]")}
  if(!a?.[0]||!a?.[1])throw new Error("Bing credentials incomplete");
  return {IG:ig[1],IID:iid[1],key:a[0],token:a[1],expires:Date.now()+Number(a[2]||300000)};
}

async function getBingToken(){
  if(bingToken&&Date.now()<bingToken.expires-10000)return bingToken;
  const r=await fetch(BING.tokenPage,{credentials:"include"});
  if(!r.ok)throw new Error("Bing token HTTP "+r.status);
  const html=await r.text();
  bingToken=parseTokenPage(html);
  translateCount=0;
  return bingToken;
}

async function bingTranslate(text){
  const {targetLang="fa"}=await chrome.storage.sync.get({targetLang:"fa"});
  const key=targetLang+"|"+text;
  if(cache.has(key))return cache.get(key);
  const t=await getBingToken();
  const body=new URLSearchParams({text:text.slice(0,1000),fromLang:"auto-detect",to:targetLang,token:t.token,key:t.key});
  const u=new URL(BING.base);
  u.searchParams.set("IG",t.IG);
  u.searchParams.set("IID",t.IID+"."+(translateCount++));
  u.searchParams.set("isVertical","1");
  const r=await fetch(u,{method:"POST",credentials:"include",headers:{"Content-Type":"application/x-www-form-urlencoded; charset=UTF-8","Referer":BING.tokenPage},body});
  if(!r.ok)throw new Error("Bing translate HTTP "+r.status);
  const data=await r.json();
  const result=data?.[0]?.translations?.[0]?.text;
  if(!result)throw new Error("Bing returned no translation");
  cache.set(key,result);
  if(cache.size>1000)cache.delete(cache.keys().next().value);
  return result;
}

chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=="TRANSLATE")return;
  (async()=>{
    try{
      const text=String(message.text||"").trim();
      if(!text)throw new Error("Empty text");
      sendResponse({ok:true,translated:await bingTranslate(text)});
    }catch(e){sendResponse({ok:false,error:e.message||String(e)})}
  })();
  return true;
});