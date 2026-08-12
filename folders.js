/*
 * Folder support for Prompt Chain Builder.
 *
 * This module is intentionally dependency-free so it can be wired into the
 * existing single-file application without changing the workflow engine.
 */
(function(){
  "use strict";

  const SYSTEM_FOLDER_NAME = "Unsortiert";
  const SYSTEM_FOLDER_ID = "folder-unsorted";

  function now(){ return Date.now(); }
  function uid(){
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "folder-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,9);
  }

  function makeFolder(name, system){
    const timestamp = now();
    return {
      id: system ? SYSTEM_FOLDER_ID : uid(),
      name: name || SYSTEM_FOLDER_NAME,
      createdAt: timestamp,
      updatedAt: timestamp,
      system: !!system
    };
  }

  function getFolderById(state, id){
    return state.folders.find(function(folder){ return folder.id === id; }) || null;
  }

  function ensureSystemFolder(state){
    if (!Array.isArray(state.folders)) state.folders = [];
    let system = state.folders.find(function(folder){ return folder.system || folder.id === SYSTEM_FOLDER_ID; });
    if (!system){
      system = makeFolder(SYSTEM_FOLDER_NAME, true);
      state.folders.unshift(system);
    } else {
      system.id = SYSTEM_FOLDER_ID;
      system.name = SYSTEM_FOLDER_NAME;
      system.system = true;
      if (!system.createdAt) system.createdAt = now();
      if (!system.updatedAt) system.updatedAt = system.createdAt;
    }
    return system;
  }

  function migrateState(state){
    if (!state || typeof state !== "object") state = {};
    const system = ensureSystemFolder(state);

    // Preserve the existing object-based workflow storage used by the app.
    if (!state.workflows) state.workflows = {};
    if (Array.isArray(state.workflows)) {
      const map = {};
      state.workflows.forEach(function(workflow){
        if (workflow && workflow.id) map[workflow.id] = workflow;
      });
      state.workflows = map;
    }

    Object.keys(state.workflows).forEach(function(id){
      const workflow = state.workflows[id];
      if (!workflow || typeof workflow !== "object") return;
      if (!workflow.id) workflow.id = id;
      if (!workflow.folderId || !getFolderById(state, workflow.folderId)) {
        workflow.folderId = system.id;
      }
    });

    if (!state.activeWorkflowId || !state.workflows[state.activeWorkflowId]) {
      const first = Object.values(state.workflows)[0];
      state.activeWorkflowId = first ? first.id : null;
    }
    if (!state.activeFolderId || !getFolderById(state, state.activeFolderId)) {
      const active = state.activeWorkflowId && state.workflows[state.activeWorkflowId];
      state.activeFolderId = active && active.folderId ? active.folderId : system.id;
    }
    if (!state.folderExpanded || typeof state.folderExpanded !== "object") state.folderExpanded = {};
    if (state.folderExpanded[system.id] == null) state.folderExpanded[system.id] = true;

    return state;
  }

  function createFolder(state, name){
    const cleanName = String(name == null ? "" : name).trim();
    if (!cleanName) throw new Error("Ordnername darf nicht leer sein.");
    if (state.folders.some(function(folder){ return folder.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(); })) {
      throw new Error("Ein Ordner mit diesem Namen existiert bereits.");
    }
    const folder = makeFolder(cleanName, false);
    state.folders.push(folder);
    state.activeFolderId = folder.id;
    state.folderExpanded[folder.id] = true;
    return folder;
  }

  function renameFolder(state, id, name){
    const folder = getFolderById(state, id);
    if (!folder) throw new Error("Ordner nicht gefunden.");
    if (folder.system) throw new Error("Der Systemordner darf nicht umbenannt werden.");
    const cleanName = String(name == null ? "" : name).trim();
    if (!cleanName) throw new Error("Ordnername darf nicht leer sein.");
    if (state.folders.some(function(other){
      return other.id !== id && other.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase();
    })) throw new Error("Ein Ordner mit diesem Namen existiert bereits.");
    folder.name = cleanName;
    folder.updatedAt = now();
    return folder;
  }

  function deleteFolder(state, id){
    const folder = getFolderById(state, id);
    if (!folder) return false;
    if (folder.system) throw new Error("Der Systemordner darf nicht gelöscht werden.");
    const system = ensureSystemFolder(state);
    Object.values(state.workflows).forEach(function(workflow){
      if (workflow && workflow.folderId === id) workflow.folderId = system.id;
    });
    state.folders = state.folders.filter(function(item){ return item.id !== id; });
    delete state.folderExpanded[id];
    if (state.activeFolderId === id) state.activeFolderId = system.id;
    return true;
  }

  function moveWorkflowToFolder(state, workflowId, folderId){
    const workflow = state.workflows[workflowId];
    const folder = getFolderById(state, folderId);
    if (!workflow) throw new Error("Workflow nicht gefunden.");
    if (!folder) throw new Error("Ungültiger Zielordner.");
    workflow.folderId = folder.id;
    workflow.updatedAt = now();
    state.activeFolderId = folder.id;
    return workflow;
  }

  function getWorkflowsForFolder(state, folderId){
    if (!getFolderById(state, folderId)) return [];
    return Object.values(state.workflows).filter(function(workflow){
      return workflow && workflow.folderId === folderId;
    });
  }

  window.ChainIndexFolders = {
    SYSTEM_FOLDER_ID: SYSTEM_FOLDER_ID,
    SYSTEM_FOLDER_NAME: SYSTEM_FOLDER_NAME,
    makeFolder: makeFolder,
    migrateState: migrateState,
    createFolder: createFolder,
    renameFolder: renameFolder,
    deleteFolder: deleteFolder,
    moveWorkflowToFolder: moveWorkflowToFolder,
    getFolderById: getFolderById,
    getWorkflowsForFolder: getWorkflowsForFolder
  };
})();
