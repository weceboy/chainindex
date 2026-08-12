(function(){
  "use strict";

  const STORAGE_KEY = "pcb-state-v1";
  const api = window.ChainIndexFolderState;
  const list = document.getElementById("workflowList");
  if (!api || !list) return;

  // Keep the existing sidebar layout and only add the small folder-specific
  // controls/styles required for navigation.
  const style = document.createElement("style");
  style.textContent = `
    .folder-toolbar{display:flex;gap:8px;margin:0 16px 12px}
    .btn-new-folder{flex:1;padding:9px 12px;border-radius:var(--radius-md);border:1px dashed var(--border);background:transparent;color:var(--text-secondary);font-size:12.5px}
    .btn-new-folder:hover{border-color:var(--accent-dim);color:var(--accent);background:var(--accent-soft)}
    .folder-group{border-radius:var(--radius-sm);margin-bottom:4px}
    .folder-group:hover{background:rgba(23,41,63,.32)}
    .folder-header{display:flex;align-items:center;min-height:38px;border-radius:var(--radius-sm)}
    .folder-toggle{flex:1;min-width:0;display:flex;align-items:center;gap:7px;padding:8px 6px 8px 7px;border:0;background:transparent;color:var(--text-primary);text-align:left;font-size:12.5px;font-weight:600}
    .folder-toggle:hover{color:var(--accent)}
    .folder-chevron{width:11px;color:var(--text-tertiary);font-size:9px}
    .folder-icon{font-size:14px;line-height:1}
    .folder-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .folder-actions{display:flex;gap:1px;padding-right:4px}
    .folder-empty{padding:5px 12px 7px 31px;color:var(--text-tertiary);font-size:10.5px;font-style:italic}
    .folder-workflows{min-width:0}
    .folder-workflows .workflow-item{margin-left:10px}
    .folder-name-input{flex:1;min-width:0;margin:3px 4px 3px 24px;padding:5px 7px;background:var(--bg-deep);border:1px solid var(--accent-dim);border-radius:6px;font-size:12.5px}
  `;
  document.head.appendChild(style);

  const originalNewWorkflow = document.getElementById("newWorkflowBtn");
  const toolbar = document.createElement("div");
  toolbar.className = "folder-toolbar";
  toolbar.innerHTML = '<button class="btn-new-folder" id="newFolderBtn" type="button">+ Neuer Ordner</button>';
  if (originalNewWorkflow) originalNewWorkflow.insertAdjacentElement("afterend", toolbar);
  const newFolderBtn = document.getElementById("newFolderBtn");

  function readState(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return api.migrateState(raw ? JSON.parse(raw) : {});
    } catch(e) {
      console.warn("Ordner-State konnte nicht gelesen werden.", e);
      return api.migrateState({});
    }
  }

  function writeState(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(api.migrateState(state)));
  }

  function esc(value){
    return String(value == null ? "" : value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function getExpanded(state, id){
    if (!state.folderExpanded || typeof state.folderExpanded !== "object") state.folderExpanded = {};
    if (state.folderExpanded[id] == null) state.folderExpanded[id] = true;
    return state.folderExpanded[id] !== false;
  }

  function render(){
    const state = readState();
    const folders = Array.isArray(state.folders) ? state.folders : [];
    const workflows = state.workflows || {};
    const orderedFolders = folders.slice().sort(function(a,b){
      if (a.system) return -1;
      if (b.system) return 1;
      return a.name.localeCompare(b.name, "de", {sensitivity:"base"});
    });

    if (!orderedFolders.length){
      list.innerHTML = '<div class="workflow-empty">Noch keine Workflows vorhanden.</div>';
      return;
    }

    list.innerHTML = orderedFolders.map(function(folder){
      const expanded = getExpanded(state, folder.id);
      const items = Object.values(workflows)
        .filter(function(w){ return w && w.folderId === folder.id; })
        .sort(function(a,b){ return (b.updatedAt || 0) - (a.updatedAt || 0); });
      const workflowHtml = expanded
        ? (items.length
          ? items.map(function(w){ return workflowHtmlFor(w, state.activeWorkflowId); }).join("")
          : '<div class="folder-empty">Keine Workflows</div>')
        : "";
      const actions = folder.system ? "" :
        '<div class="folder-actions">' +
          '<button class="icon-btn-sm" type="button" data-folder-action="rename" title="Ordner umbenennen">✎</button>' +
          '<button class="icon-btn-sm icon-btn-danger" type="button" data-folder-action="delete" title="Ordner löschen">🗑</button>' +
        '</div>';
      return '<section class="folder-group" data-folder-id="'+esc(folder.id)+'">' +
        '<div class="folder-header">' +
          '<button class="folder-toggle" type="button" data-folder-action="toggle" aria-expanded="'+(expanded?'true':'false')+'">' +
            '<span class="folder-chevron">'+(expanded?'▼':'▶')+'</span>' +
            '<span class="folder-icon">📁</span>' +
            '<span class="folder-name">'+esc(folder.name)+'</span>' +
          '</button>' +
          actions +
        '</div>' +
        '<div class="folder-workflows">'+workflowHtml+'</div>' +
      '</section>';
    }).join("");
  }

  function workflowHtmlFor(w, activeWorkflowId){
    return '<div class="workflow-item '+(w.id===activeWorkflowId?'is-active':'')+'" data-id="'+esc(w.id)+'">' +
      '<button class="workflow-select" type="button" data-action="select">' +
        '<span class="workflow-name">'+esc(w.name)+'</span>' +
        '<span class="workflow-meta">'+(Array.isArray(w.steps)?w.steps.length:0)+(Array.isArray(w.steps)&&w.steps.length===1?' Schritt':' Schritte')+'</span>' +
      '</button>' +
      '<div class="workflow-item-actions">' +
        '<button class="icon-btn-sm" type="button" data-action="rename" title="Umbenennen">✎</button>' +
        '<button class="icon-btn-sm" type="button" data-action="move" title="In Ordner verschieben">↗</button>' +
        '<button class="icon-btn-sm" type="button" data-action="export" title="Exportieren">⭳</button>' +
        '<button class="icon-btn-sm icon-btn-danger" type="button" data-action="delete" title="Löschen">🗑</button>' +
      '</div>' +
    '</div>';
  }

  function saveFolderExpanded(id, expanded){
    const state = readState();
    if (!state.folderExpanded || typeof state.folderExpanded !== "object") state.folderExpanded = {};
    state.folderExpanded[id] = expanded;
    writeState(state);
    render();
  }

  function createFolder(){
    const name = window.prompt("Name des neuen Ordners:", "");
    if (name == null) return;
    if (!String(name).trim()) return window.alert("Der Ordnername darf nicht leer sein.");
    try {
      const state = readState();
      const folder = api.createFolder(name);
      state.folders.push(folder);
      state.activeFolderId = folder.id;
      state.folderExpanded = state.folderExpanded || {};
      state.folderExpanded[folder.id] = true;
      writeState(state);
      render();
    } catch(e) {
      window.alert(e.message || "Ordner konnte nicht angelegt werden.");
    }
  }

  function renameFolder(group){
    const state = readState();
    const id = group.dataset.folderId;
    const folder = api.getFolderById(state, id);
    if (!folder || folder.system) return;
    const input = document.createElement("input");
    input.className = "folder-name-input";
    input.value = folder.name;
    const nameEl = group.querySelector(".folder-name");
    nameEl.replaceWith(input);
    input.focus(); input.select();
    let finished = false;
    function finish(commit){
      if (finished) return;
      finished = true;
      if (!commit){ render(); return; }
      try {
        api.renameFolder(state, id, input.value);
        writeState(state);
        render();
      } catch(e) {
        window.alert(e.message || "Ordner konnte nicht umbenannt werden.");
        render();
      }
    }
    input.onkeydown = function(e){
      if (e.key === "Enter") finish(true);
      if (e.key === "Escape") finish(false);
    };
    input.onblur = function(){ finish(true); };
  }

  function deleteFolder(group){
    const state = readState();
    const id = group.dataset.folderId;
    const folder = api.getFolderById(state, id);
    if (!folder || folder.system) return;
    const count = api.getWorkflowsForFolder(state, id).length;
    const detail = count ? " Die "+count+" enthaltenen Workflows werden nach „Unsortiert“ verschoben." : "";
    if (!window.confirm('Ordner „'+folder.name+'“ löschen?'+detail)) return;
    try {
      api.deleteFolder(state, id);
      writeState(state);
      window.location.reload();
    } catch(e) {
      window.alert(e.message || "Ordner konnte nicht gelöscht werden.");
    }
  }

  function moveWorkflow(workflowId){
    const state = readState();
    const workflow = state.workflows && state.workflows[workflowId];
    if (!workflow) return;
    const targetFolders = state.folders.filter(function(folder){ return folder.id !== workflow.folderId; });
    if (!targetFolders.length) return;
    const lines = targetFolders.map(function(folder,i){ return (i+1)+". "+folder.name; }).join("\n");
    const choice = window.prompt("In welchen Ordner verschieben?\n\n"+lines, "");
    if (choice == null) return;
    const index = parseInt(choice,10)-1;
    if (!Number.isInteger(index) || !targetFolders[index]) return window.alert("Ungültige Auswahl.");
    try {
      api.moveWorkflowToFolder(state, workflowId, targetFolders[index].id);
      writeState(state);
      window.location.reload();
    } catch(e) {
      window.alert(e.message || "Workflow konnte nicht verschoben werden.");
    }
  }

  list.addEventListener("click", function(e){
    const group = e.target.closest(".folder-group");
    if (!group) return;
    const folderAction = e.target.closest("[data-folder-action]");
    if (!folderAction) return;
    e.preventDefault();
    e.stopPropagation();
    const action = folderAction.dataset.folderAction;
    if (action === "toggle") {
      const state = readState();
      saveFolderExpanded(group.dataset.folderId, !getExpanded(state, group.dataset.folderId));
    }
    if (action === "rename") renameFolder(group);
    if (action === "delete") deleteFolder(group);
  }, true);

  list.addEventListener("click", function(e){
    const action = e.target.closest('[data-action="move"]');
    if (!action) return;
    e.preventDefault();
    e.stopPropagation();
    const item = action.closest(".workflow-item");
    if (item) moveWorkflow(item.dataset.id);
  }, true);

  if (newFolderBtn) newFolderBtn.addEventListener("click", createFolder);

  render();
  list.dataset.folderStateSignature = localStorage.getItem(STORAGE_KEY) || "";
  window.setInterval(function(){
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    if (raw !== list.dataset.folderStateSignature){
      list.dataset.folderStateSignature = raw;
      render();
    }
  }, 400);
})();
