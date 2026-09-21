(() => {
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function toast(msg){
    let el=document.getElementById("cloudToast");
    if(!el){el=document.createElement("div");el.id="cloudToast";el.className="cloudToast";document.body.appendChild(el);}
    el.textContent=msg;el.classList.add("show");clearTimeout(window.__cloudToast);window.__cloudToast=setTimeout(()=>el.classList.remove("show"),2200);
  }
  function styles(){
    if(document.getElementById("cloudUiStyle")) return;
    const s=document.createElement("style");s.id="cloudUiStyle";
    s.textContent=".cloudPanel{margin-top:14px;padding:16px}.cloudPanel h3{margin:5px 0 4px}.cloudPanel p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.cloudActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cloudActions .input{min-width:240px;flex:1}.cloudState{font-size:10px;color:var(--muted);margin-top:8px}.cloudToast{position:fixed;right:20px;bottom:20px;z-index:120;background:#102f2a;color:#8cf0d6;border:1px solid #2f6b60;border-radius:10px;padding:10px 13px;font-size:12px;opacity:0;transform:translateY(10px);pointer-events:none;transition:.16s}.cloudToast.show{opacity:1;transform:translateY(0)}";
    document.head.appendChild(s);
  }
  async function render(){
    const cloud=window.RADAR_CLOUD;
    if(!cloud?.enabled) return;
    const workflow=document.getElementById("workflow");
    if(!workflow) return;
    let panel=document.getElementById("cloudPanel");
    if(!panel){panel=document.createElement("div");panel.id="cloudPanel";panel.className="card cloudPanel";workflow.appendChild(panel);}
    const user=await cloud.getUser();
    if(!user){
      panel.innerHTML='<div class="eyebrow">Cloud workspace</div><h3>Sign in to sync devices</h3><p>Use a magic link. Local data remains available even if you stay signed out.</p><div class="cloudActions"><input class="input" id="cloudEmail" type="email" placeholder="Email"><button class="btn primary" id="cloudMagic" type="button">Send magic link</button></div><div class="cloudState" id="cloudState">Cloud sync ready · signed out</div>';
      document.getElementById("cloudMagic").onclick=async()=>{
        const email=document.getElementById("cloudEmail").value.trim();
        if(!email) return;
        const btn=document.getElementById("cloudMagic");btn.disabled=true;btn.textContent="Sending…";
        try{await cloud.requestMagicLink(email);document.getElementById("cloudState").textContent="Magic link sent to "+email;toast("Magic link sent");}
        catch(e){document.getElementById("cloudState").textContent="Could not send magic link";alert(e.message);}
        finally{btn.disabled=false;btn.textContent="Send magic link";}
      };
      return;
    }
    panel.innerHTML='<div class="eyebrow">Cloud workspace</div><h3>Signed in</h3><p>'+esc(user.email||"Authenticated user")+'</p><div class="cloudActions"><button class="btn primary" id="cloudPush" type="button">Upload local workspace</button><button class="btn ghost" id="cloudPull" type="button">Pull cloud workspace</button><button class="btn ghost" id="cloudLogout" type="button">Sign out</button></div><div class="cloudState" id="cloudState">Ready</div>';
    document.getElementById("cloudPush").onclick=async()=>{
      const st=document.getElementById("cloudState");st.textContent="Uploading…";
      try{const r=await cloud.pushLocalWorkspace();st.textContent="Uploaded: "+r.shortlist+" shortlist · "+r.pipeline+" pipeline · "+r.notes+" notes";toast("Cloud upload complete");}
      catch(e){st.textContent="Upload failed";alert(e.message);}
    };
    document.getElementById("cloudPull").onclick=async()=>{
      const st=document.getElementById("cloudState");st.textContent="Downloading…";
      try{const r=await cloud.pullWorkspace();st.textContent="Downloaded: "+r.shortlist+" shortlist · "+r.pipeline+" pipeline · "+r.notes+" notes";toast("Cloud workspace restored");setTimeout(()=>location.reload(),500);}
      catch(e){st.textContent="Download failed";alert(e.message);}
    };
    document.getElementById("cloudLogout").onclick=async()=>{await cloud.signOut();render();};
  }
  function init(){styles();render();}
  document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
})();