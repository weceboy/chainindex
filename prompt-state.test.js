// Lightweight browser-side regression checks for Chunk 4.
// Run by loading prompt-state.js in a browser console, then evaluating this file.
(function(){
  "use strict";
  const api=window.ChainIndexPromptState;
  if(!api) throw new Error("ChainIndexPromptState fehlt.");
  const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
  const state=api.migrateState({prompts:{},promptFolders:[]});
  assert(api.getPromptFolderById(state,api.SYSTEM_FOLDER_ID).system,"Systemordner fehlt");
  const folder=api.createFolderOnState(state,"Research");
  const p=api.createPrompt("Research", "Analysiere Quellen", folder.id);
  state.prompts[p.id]=p;
  const created=p.createdAt;
  api.updatePrompt(state,p.id,"Research Updated","Neuer Inhalt",folder.id);
  assert(p.createdAt===created,"createdAt wurde verändert");
  assert(p.updatedAt>=created,"updatedAt wurde nicht aktualisiert");
  const copy=api.duplicatePrompt(state,p.id);
  assert(copy.id!==p.id && copy.folderId===folder.id && copy.content===p.content,"Duplikat fehlerhaft");
  api.movePromptToFolder(state,copy.id,api.SYSTEM_FOLDER_ID);
  assert(copy.folderId===api.SYSTEM_FOLDER_ID,"Verschieben fehlgeschlagen");
  api.deletePromptFolder(state,folder.id);
  assert(p.folderId===api.SYSTEM_FOLDER_ID,"Prompts wurden beim Ordnerlöschen nicht nach Unsortiert verschoben");
  console.log("Chunk 4 prompt-state checks: OK");
})();
