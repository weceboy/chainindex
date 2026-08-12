(function(){
  "use strict";

  const STORAGE_KEY = "pcb-state-v1";
  const HASH_PREFIX = "#workflow/";

  function readState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch(e) {
      return null;
    }
  }

  function titlePart(title){
    return String(title == null ? "" : title).trim().slice(0, 8);
  }

  function createWorkflowDeepLink(workflowId){
    const state = readState();
    const workflow = state && state.workflows && state.workflows[workflowId];
    if (!workflow) return null;
    const suffix = titlePart(workflow.name);
    const base = window.location.href.split("#")[0];
    return base + HASH_PREFIX + encodeURIComponent(workflow.id) + "/" + encodeURIComponent(suffix);
  }

  function getWorkflowIdFromHash(){
    if (!window.location.hash.startsWith(HASH_PREFIX)) return null;
    const value = window.location.hash.slice(HASH_PREFIX.length);
    const slash = value.indexOf("/");
    const encodedId = slash === -1 ? value : value.slice(0, slash);
    try { return decodeURIComponent(encodedId); } catch(e) { return null; }
  }

  function openDeepLinkedWorkflow(){
    const id = getWorkflowIdFromHash();
    if (!id) return false;
    const state = readState();
    if (!state || !state.workflows || !state.workflows[id]) return false;

    function tryOpen(){
      const item = document.querySelector('.workflow-item[data-id="'+CSS.escape(id)+'"]');
      if (item) {
        const select = item.querySelector('[data-action="select"]') || item.querySelector('.workflow-select');
        if (select) select.click();
        return true;
      }
      if (typeof window.setActive === "function") {
        window.setActive(id);
        return true;
      }
      return false;
    }

    if (tryOpen()) return true;
    let attempts = 0;
    const timer = window.setInterval(function(){
      attempts++;
      if (tryOpen() || attempts >= 30) window.clearInterval(timer);
    }, 100);
    return true;
  }

  window.createWorkflowDeepLink = createWorkflowDeepLink;
  window.getWorkflowIdFromDeepLink = getWorkflowIdFromHash;
  window.addEventListener("hashchange", openDeepLinkedWorkflow);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", openDeepLinkedWorkflow);
  } else {
    openDeepLinkedWorkflow();
  }
})();
