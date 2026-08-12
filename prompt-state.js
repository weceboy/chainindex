(function(){
  "use strict";

  const SYSTEM_FOLDER_ID = "prompt-folder-unsorted";
  const SYSTEM_FOLDER_NAME = "Unsortiert";

  function uid(prefix){
    const id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
    return (prefix || "id-") + id;
  }
  function now(){ return new Date().toISOString(); }
  function normalizeName(value){ return String(value == null ? "" : value).trim(); }

  function createSystemFolder(){
    const t = now();
    return {id:SYSTEM_FOLDER_ID,name:SYSTEM_FOLDER_NAME,createdAt:t,updatedAt:t,system:true};
  }
  function createPromptFolder(name){
    const value=normalizeName(name);
    if(!value) throw new Error("Der Ordnername darf nicht leer sein.");
    if(value.toLowerCase()===SYSTEM_FOLDER_NAME.toLowerCase()) throw new Error("Der Systemordner darf nicht erneut angelegt werden.");
    const t=now();
    return {id:uid("prompt-folder-"),name:value,createdAt:t,updatedAt:t,system:false};
  }
  function createPrompt(title,content,folderId){
    const t=now();
    return {id:uid("prompt-"),title:normalizeName(title)||"Neuer Prompt",content:String(content==null?"":content),folderId:folderId||SYSTEM_FOLDER_ID,createdAt:t,updatedAt:t};
  }

  function ensurePromptState(state){
    if(!state || typeof state!=="object") throw new Error("Ungültiger State.");
    if(!Array.isArray(state.promptFolders)) state.promptFolders=[];
    let system=state.promptFolders.find(f=>f && (f.id===SYSTEM_FOLDER_ID || f.system===true));
    if(!system){ system=createSystemFolder(); state.promptFolders.unshift(system); }
    else { system.id=SYSTEM_FOLDER_ID; system.name=SYSTEM_FOLDER_NAME; system.system=true; system.createdAt=system.createdAt||now(); system.updatedAt=system.updatedAt||system.createdAt; }
    if(!state.prompts || typeof state.prompts!=="object" || Array.isArray(state.prompts)) state.prompts={};
    Object.keys(state.prompts).forEach(id=>{
      const p=state.prompts[id];
      if(!p || typeof p!=="object") { delete state.prompts[id]; return; }
      p.id=p.id||id;
      p.title=normalizeName(p.title)||"Unbenannter Prompt";
      p.content=String(p.content==null?"":p.content);
      p.folderId=getPromptFolderById(state,p.folderId)?p.folderId:SYSTEM_FOLDER_ID;
      p.createdAt=p.createdAt||now();
      p.updatedAt=p.updatedAt||p.createdAt;
    });
    if(!state.activePromptFolderId || !getPromptFolderById(state,state.activePromptFolderId)){
      const active=state.prompts[state.activePromptId];
      state.activePromptFolderId=active && getPromptFolderById(state,active.folderId) ? active.folderId : SYSTEM_FOLDER_ID;
    }
    if(!state.promptFolderExpanded || typeof state.promptFolderExpanded!=="object") state.promptFolderExpanded={};
    if(state.promptFolderExpanded[SYSTEM_FOLDER_ID]==null) state.promptFolderExpanded[SYSTEM_FOLDER_ID]=true;
    return state;
  }

  function getPromptFolderById(state,id){ return Array.isArray(state && state.promptFolders) ? state.promptFolders.find(f=>f.id===id)||null : null; }
  function getPromptById(state,id){ return state && state.prompts ? state.prompts[id]||null : null; }
  function getPromptsForFolder(state,folderId){
    if(!getPromptFolderById(state,folderId)) return [];
    return Object.values(state.prompts||{}).filter(p=>p && p.folderId===folderId).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  function createFolderOnState(state,name){ const f=createPromptFolder(name); state.promptFolders.push(f); return f; }
  function renamePromptFolder(state,id,name){
    const f=getPromptFolderById(state,id); if(!f) throw new Error("Prompt-Ordner nicht gefunden.");
    if(f.system) throw new Error("Der Systemordner darf nicht umbenannt werden.");
    const value=normalizeName(name); if(!value) throw new Error("Der Ordnername darf nicht leer sein.");
    if(state.promptFolders.some(x=>x.id!==id && x.name.toLowerCase()===value.toLowerCase())) throw new Error("Ein Ordner mit diesem Namen existiert bereits.");
    f.name=value; f.updatedAt=now(); return f;
  }
  function deletePromptFolder(state,id){
    const f=getPromptFolderById(state,id); if(!f) throw new Error("Prompt-Ordner nicht gefunden.");
    if(f.system) throw new Error("Der Systemordner darf nicht gelöscht werden.");
    Object.values(state.prompts||{}).forEach(p=>{if(p && p.folderId===id) p.folderId=SYSTEM_FOLDER_ID;});
    state.promptFolders=state.promptFolders.filter(x=>x.id!==id);
    delete state.promptFolderExpanded[id];
    if(state.activePromptFolderId===id) state.activePromptFolderId=SYSTEM_FOLDER_ID;
    return SYSTEM_FOLDER_ID;
  }
  function updatePrompt(state,id,title,content,folderId){
    const p=getPromptById(state,id); if(!p) throw new Error("Prompt nicht gefunden.");
    const value=normalizeName(title); if(!value) throw new Error("Der Titel darf nicht leer sein.");
    if(!getPromptFolderById(state,folderId)) throw new Error("Ungültiger Prompt-Ordner.");
    p.title=value; p.content=String(content==null?"":content); p.folderId=folderId; p.updatedAt=now();
    return p;
  }
  function renamePrompt(state,id,title){ const p=getPromptById(state,id); if(!p) throw new Error("Prompt nicht gefunden."); const v=normalizeName(title); if(!v) throw new Error("Der Titel darf nicht leer sein."); p.title=v; p.updatedAt=now(); return p; }
  function deletePrompt(state,id){ if(!getPromptById(state,id)) throw new Error("Prompt nicht gefunden."); delete state.prompts[id]; if(state.activePromptId===id) state.activePromptId=null; }
  function duplicatePrompt(state,id){
    const source=getPromptById(state,id); if(!source) throw new Error("Prompt nicht gefunden.");
    const copy=createPrompt(source.title+" (Copy)",source.content,source.folderId); state.prompts[copy.id]=copy; state.activePromptId=copy.id; state.activePromptFolderId=copy.folderId; return copy;
  }
  function movePromptToFolder(state,id,folderId){ const p=getPromptById(state,id); if(!p) throw new Error("Prompt nicht gefunden."); if(!getPromptFolderById(state,folderId)) throw new Error("Ungültiger Prompt-Ordner."); p.folderId=folderId; p.updatedAt=now(); state.activePromptFolderId=folderId; return p; }

  function migrateState(state){ return ensurePromptState(state && typeof state==="object" ? state : {}); }

  window.ChainIndexPromptState={SYSTEM_FOLDER_ID,SYSTEM_FOLDER_NAME,createPrompt,createPromptFolder,createSystemFolder,ensurePromptState,migrateState,getPromptFolderById,getPromptById,getPromptsForFolder,createFolderOnState,renamePromptFolder,deletePromptFolder,updatePrompt,renamePrompt,deletePrompt,duplicatePrompt,movePromptToFolder};
})();
