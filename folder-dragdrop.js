(function(){
  "use strict";

  const STORAGE_KEY = "pcb-state-v1";
  const api = window.ChainIndexFolderState;
  const list = document.getElementById("workflowList");
  if (!api || !list) return;

  const style = document.createElement("style");
  style.textContent = `
    .workflow-item[draggable="true"]{cursor:grab}
    .workflow-item[draggable="true"]:active{cursor:grabbing}
    .workflow-item.is-dragging{opacity:.45}
    .folder-group.is-drag-over > .folder-header{background:var(--accent-soft);outline:1px dashed var(--accent-dim)}
    .folder-group.is-drag-over .folder-toggle{color:var(--accent)}
    .workflow-item [data-action="move"]{display:none}
  `;
  document.head.appendChild(style);

  function readState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return api.migrateState(raw ? JSON.parse(raw) : {});
    } catch(e) {
      console.warn("Drag-and-drop State konnte nicht gelesen werden.", e);
      return null;
    }
  }

  function writeState(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(api.migrateState(state)));
  }

  function refreshDraggable(){
    list.querySelectorAll(".workflow-item[data-id]").forEach(function(item){
      item.setAttribute("draggable", "true");
    });
  }

  function clearDragOver(){
    list.querySelectorAll(".folder-group.is-drag-over").forEach(function(folder){
      folder.classList.remove("is-drag-over");
    });
  }

  list.addEventListener("dragstart", function(event){
    const item = event.target.closest(".workflow-item[data-id]");
    if (!item) return;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", item.dataset.id);
    event.dataTransfer.setData("application/x-chainindex-workflow", item.dataset.id);
  });

  list.addEventListener("dragend", function(event){
    const item = event.target.closest(".workflow-item[data-id]");
    if (item) item.classList.remove("is-dragging");
    clearDragOver();
  });

  list.addEventListener("dragover", function(event){
    const folder = event.target.closest(".folder-group[data-folder-id]");
    if (!folder) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDragOver();
    folder.classList.add("is-drag-over");
  });

  list.addEventListener("dragleave", function(event){
    const folder = event.target.closest(".folder-group[data-folder-id]");
    if (!folder) return;
    if (!folder.contains(event.relatedTarget)) folder.classList.remove("is-drag-over");
  });

  list.addEventListener("drop", function(event){
    const folder = event.target.closest(".folder-group[data-folder-id]");
    if (!folder) return;
    event.preventDefault();
    event.stopPropagation();
    const workflowId = event.dataTransfer.getData("application/x-chainindex-workflow") || event.dataTransfer.getData("text/plain");
    const folderId = folder.dataset.folderId;
    clearDragOver();
    if (!workflowId || !folderId) return;

    const state = readState();
    if (!state || !state.workflows || !state.workflows[workflowId]) return;
    if (!api.getFolderById(state, folderId)) return;
    if (state.workflows[workflowId].folderId === folderId) return;

    try {
      api.moveWorkflowToFolder(state, workflowId, folderId);
      writeState(state);
      refreshDraggable();
      window.dispatchEvent(new CustomEvent("chainindex:workflow-moved", {detail:{workflowId:workflowId,folderId:folderId}}));
    } catch(e) {
      window.alert(e.message || "Workflow konnte nicht verschoben werden.");
    }
  });

  const observer = new MutationObserver(refreshDraggable);
  observer.observe(list, {childList:true,subtree:true});
  refreshDraggable();
})();
