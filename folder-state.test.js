const assert = require("node:assert/strict");

const SYSTEM_FOLDER_ID = "folder-unsorted";
const SYSTEM_FOLDER_NAME = "Unsortiert";

function now(){ return new Date().toISOString(); }
function systemFolder(){ const t = now(); return { id:SYSTEM_FOLDER_ID, name:SYSTEM_FOLDER_NAME, createdAt:t, updatedAt:t, system:true }; }
function getFolder(state,id){ return state.folders.find(folder => folder.id === id) || null; }
function migrate(state){
  state.folders = Array.isArray(state.folders) ? state.folders : [];
  let system = state.folders.find(folder => folder.system === true || folder.id === SYSTEM_FOLDER_ID);
  if (!system) state.folders.unshift(system = systemFolder());
  system.id = SYSTEM_FOLDER_ID;
  system.name = SYSTEM_FOLDER_NAME;
  system.system = true;
  state.workflows = state.workflows || {};
  Object.keys(state.workflows).forEach(id => {
    const workflow = state.workflows[id];
    workflow.id = workflow.id || id;
    workflow.folderId = getFolder(state, workflow.folderId) ? workflow.folderId : SYSTEM_FOLDER_ID;
  });
  if (!state.activeFolderId || !getFolder(state,state.activeFolderId)) state.activeFolderId = state.workflows[state.activeWorkflowId]?.folderId || SYSTEM_FOLDER_ID;
  return state;
}
function deleteFolder(state,id){
  const folder = getFolder(state,id);
  assert(folder && !folder.system);
  for (const workflow of Object.values(state.workflows)) if (workflow.folderId === id) workflow.folderId = SYSTEM_FOLDER_ID;
  state.folders = state.folders.filter(item => item.id !== id);
  if (state.activeFolderId === id) state.activeFolderId = SYSTEM_FOLDER_ID;
}

const old = migrate({ activeWorkflowId:"w1", workflows:{ w1:{ id:"w1", name:"Legacy", steps:[] } } });
assert.equal(old.folders.length,1);
assert.equal(old.folders[0].name,SYSTEM_FOLDER_NAME);
assert.equal(old.workflows.w1.folderId,SYSTEM_FOLDER_ID);
assert.equal(old.activeFolderId,SYSTEM_FOLDER_ID);

const content = { id:"folder-content", name:"Content", createdAt:now(), updatedAt:now(), system:false };
old.folders.push(content);
old.workflows.w2 = { id:"w2", name:"In Content", folderId:content.id, steps:[] };
old.activeFolderId = content.id;
deleteFolder(old,content.id);
assert.equal(old.workflows.w2.folderId,SYSTEM_FOLDER_ID);
assert.equal(getFolder(old,content.id),null);
assert.equal(old.activeFolderId,SYSTEM_FOLDER_ID);

assert.throws(() => { const f = {id:SYSTEM_FOLDER_ID,name:SYSTEM_FOLDER_NAME,system:true}; if (f.system) throw new Error("system folder protected"); });
console.log("folder-state tests passed");
