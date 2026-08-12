(function(){
  "use strict";
  const STORAGE_KEY="pcb-state-v1",api=window.ChainIndexFolderState,list=document.getElementById("workflowList");
  if(!api||!list)return;
  const style=document.createElement("style");style.textContent=`
    .workflow-list{gap:6px;padding:8px 12px 16px}
    .folder-group{border:1px solid transparent;border-radius:10px;overflow:hidden;transition:background .15s,border-color .15s}
    .folder-group:hover{background:rgba(23,41,63,.38)}
    .folder-header{display:flex;align-items:center;min-height:40px;padding:3px 5px 3px 7px;border-radius:9px;transition:background .15s}
    .folder-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:7px;border:0;background:transparent;color:var(--text-secondary);padding:8px 7px;text-align:left;font-size:12.5px;font-weight:600;letter-spacing:.1px}
    .folder-toggle:hover{color:var(--text-primary)}
    .folder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .folder-actions{display:flex;gap:1px;opacity:0;transition:opacity .15s}
    .folder-group:hover .folder-actions,.folder-actions:focus-within{opacity:1}
    .folder-workflows{padding:0 5px 5px 13px}
    .folder-empty{margin:2px 6px 6px;padding:8px 10px;color:var(--text-tertiary);font-size:11px;border-left:1px solid var(--border);font-style:italic}
    .folder-group.is-drag-over{background:var(--accent-soft);border-color:var(--accent-dim)}
    .folder-group.is-drag-over .folder-header{background:rgba(45,212,191,.08)}
    .folder-group.is-drag-over .folder-toggle{color:var(--accent)}
    .workflow-item{position:relative;margin:1px 0 2px;border:1px solid transparent;transition:background .15s,border-color .15s,transform .15s}
    .workflow-item:hover{border-color:var(--border)}
    .workflow-item.is-active{border-color:rgba(45,212,191,.25);box-shadow:inset 2px 0 0 var(--accent)}
    .workflow-item.is-dragging{opacity:.4;transform:scale(.985)}
    .workflow-item[draggable="true"]{cursor:grab}
    .workflow-item[draggable="true"]:active{cursor:grabbing}
    .workflow-item-actions{opacity:0;transition:opacity .15s}
    .workflow-item:hover .workflow-item-actions,.workflow-item:focus-within .workflow-item-actions{opacity:1}
    .workflow-item [data-action="move"]{display:none}
    #newFolderBtn{margin-top:0}
  `;document.head.appendChild(style);
  function readState(){try{const raw=localStorage.getItem(STORAGE_KEY);return api.migrateState(raw?JSON.parse(raw):{})}catch(e){console.warn("Drag-and-drop State konnte nicht gelesen werden.",e);return null}}
  function writeState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(api.migrateState(state)))}
  function refreshDraggable(){list.querySelectorAll(".workflow-item[data-id]").forEach(item=>item.setAttribute("draggable","true"))}
  function clearDragOver(){list.querySelectorAll(".folder-group.is-drag-over").forEach(folder=>folder.classList.remove("is-drag-over"))}
  list.addEventListener("dragstart",function(event){const item=event.target.closest(".workflow-item[data-id]");if(!item)return;item.classList.add("is-dragging");event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",item.dataset.id);event.dataTransfer.setData("application/x-chainindex-workflow",item.dataset.id)});
  list.addEventListener("dragend",function(event){const item=event.target.closest(".workflow-item[data-id]");if(item)item.classList.remove("is-dragging");clearDragOver()});
  list.addEventListener("dragover",function(event){const folder=event.target.closest(".folder-group[data-folder-id]");if(!folder)return;event.preventDefault();event.dataTransfer.dropEffect="move";clearDragOver();folder.classList.add("is-drag-over")});
  list.addEventListener("dragleave",function(event){const folder=event.target.closest(".folder-group[data-folder-id]");if(!folder)return;if(!folder.contains(event.relatedTarget))folder.classList.remove("is-drag-over")});
  list.addEventListener("drop",function(event){const folder=event.target.closest(".folder-group[data-folder-id]");if(!folder)return;event.preventDefault();event.stopPropagation();const workflowId=event.dataTransfer.getData("application/x-chainindex-workflow")||event.dataTransfer.getData("text/plain"),folderId=folder.dataset.folderId;clearDragOver();if(!workflowId||!folderId)return;const state=readState();if(!state||!state.workflows||!state.workflows[workflowId]||!api.getFolderById(state,folderId))return;if(state.workflows[workflowId].folderId===folderId)return;try{api.moveWorkflowToFolder(state,workflowId,folderId);writeState(state);window.dispatchEvent(new CustomEvent("chainindex:workflow-moved",{detail:{workflowId,folderId}}))}catch(e){window.alert(e.message||"Workflow konnte nicht verschoben werden.")}});
  new MutationObserver(refreshDraggable).observe(list,{childList:true,subtree:true});refreshDraggable();
})();