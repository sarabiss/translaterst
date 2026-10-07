(()=>{
  const host=location.hostname;
  const twitch=host.includes("twitch.tv"), kick=host.includes("kick.com");
  if(!twitch&&!kick) return;
  const done=new WeakSet(), queue=[];
  let running=0;
  const MAX=2;
  const norm=s=>s.replace(/\\s+/g," ").trim();

  function shouldTranslate(t){
    if(!t||t.length<3||t.length>500) return false;
    if(/^(lol+|lmao+|haha+|gg|wp|glhf|xd|xD|:d|❤️|❤)$/i.test(t)) return false;
    return t.replace(/[^A-Za-z\\u0600-\\u06FF]/g,"").length>=3;
  }

  function textOf(node){
    if(twitch){
      const b=node.querySelector('[data-a-target="chat-line-message-body"]');
      if(b) return norm(b.innerText);
    }
    if(kick){
      const els=node.querySelectorAll('[data-testid*="message"],[class*="message"],[class*="Message"]');
      for(const e of els){const t=norm(e.innerText);if(t)return t;}
    }
    const c=node.cloneNode(true);
    c.querySelectorAll("button,img,svg,[data-translated-by-extension]").forEach(e=>e.remove());
    return norm(c.innerText);
  }

  function addTranslation(text){
    const box=document.createElement("div");
    box.dataset.translatedByExtension="1";
    box.textContent="↳ "+text;
    box.style.cssText="margin-top:2px;padding:2px 0;font-size:.92em;line-height:1.3;opacity:.82;direction:rtl;unicode-bidi:plaintext;white-space:pre-wrap";
    return box;
  }

  async function process(item){
    const {node,text}=item;
    if(!node.isConnected||done.has(node)) return;
    done.add(node);
    try{
      const r=await chrome.runtime.sendMessage({type:"TRANSLATE",text});
      if(!r?.ok||!node.isConnected)return;
      const target=twitch?(node.querySelector('[data-a-target="chat-line-message-body"]')||node):node;
      if(target.querySelector?.('[data-translated-by-extension]'))return;
      target.appendChild(addTranslation(r.translated));
    }catch(_){}
  }

  function pump(){
    while(running<MAX&&queue.length){
      running++;
      process(queue.shift()).finally(()=>{running--;pump();});
    }
  }

  function inspect(node){
    if(!(node instanceof Element)||node.hasAttribute("data-translated-by-extension"))return;
    const t=textOf(node);
    if(!shouldTranslate(t))return;
    if(node.children.length>30&&!node.matches('[data-a-target="chat-line-message"]'))return;
    queue.push({node,text:t});pump();
  }

  function scan(root){
    inspect(root);
    root.querySelectorAll?.(twitch?'[data-a-target="chat-line-message"]':'[data-testid*="chat"],[class*="chat-message"],[class*="ChatMessage"]').forEach(inspect);
  }

  new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(scan))).observe(document.documentElement,{childList:true,subtree:true});
  scan(document.body);
})();