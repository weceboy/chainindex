(function(){
  "use strict";
  const sidebar=document.getElementById("sidebar");
  if(!sidebar || document.getElementById("promptManagerNav")) return;
  const style=document.createElement("style");
  style.textContent='.prompt-manager-nav{margin:0 16px 10px;display:block;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-panel);color:var(--text-secondary);text-decoration:none;font-size:12.5px}.prompt-manager-nav:hover{color:var(--accent);border-color:var(--accent-dim);background:var(--accent-soft)}';
  document.head.appendChild(style);
  const link=document.createElement("a");
  link.id="promptManagerNav";
  link.className="prompt-manager-nav";
  link.href="./prompt-manager.html";
  link.textContent="📝 Prompt Manager";
  const anchor=document.getElementById("newWorkflowBtn");
  if(anchor) anchor.insertAdjacentElement("afterend",link); else sidebar.appendChild(link);
})();
