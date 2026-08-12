/* Chunk 3 regression checks. Run in a browser/Node harness that provides window.crypto.randomUUID. */
(function(){
  "use strict";
  const assert=(condition,message)=>{if(!condition)throw new Error(message)};
  if(typeof window==="undefined"||!window.ChainIndexFolderState){
    if(typeof console!=="undefined") console.info("node-model.test.js: load after folder-state.js/node-model.js in a browser harness.");
    return;
  }
  const api=window.ChainIndexNodeModel;
  const state={folders:[{id:"folder-unsorted",name:"Unsortiert",system:true}],workflows:{w:{id:"w",name:"Legacy",folderId:"folder-unsorted",steps:[{id:"s1",title:"A",input:"in",template:"T"},{id:"s2",title:"B",input:"",template:"U"}]}}};
  const migrated=window.ChainIndexFolderState.migrateState(state);
  assert(api&&api.NODE_TYPES.LLM==="llm","Node type registry missing");
  assert(Array.isArray(migrated.workflows.w.nodes),"Legacy workflow was not projected to nodes");
  assert(migrated.workflows.w.nodes.length===2,"Node count changed during migration");
  assert(migrated.workflows.w.nodes[0].type==="llm","Legacy step must default to LLM");
  assert(Array.isArray(migrated.workflows.w.edges)&&migrated.workflows.w.edges.length===1,"Linear edges were not created");
  assert(migrated.workflows.w.edges[0].source===migrated.workflows.w.nodes[0].id,"Edge source mismatch");
  const graph={id:"g",name:"Graph",folderId:"folder-unsorted",nodes:[{id:"a",type:"router",title:"Route",config:{},input:"",output:"",metadata:{}},{id:"b",type:"sop",title:"SOP",config:{context:{description:"Check",url:"https://example.test",label:"Research",required:true}},input:"",output:"",metadata:{}}],edges:[{id:"e",source:"a",target:"b",condition:"pass"}]};
  const graphState=window.ChainIndexFolderState.migrateState({folders:state.folders,workflows:{g:graph}});
  assert(graphState.workflows.g.nodes[0].type==="router","Graph node type was not preserved");
  assert(graphState.workflows.g.edges[0].condition==="pass","Edge condition was not preserved");
  assert(graphState.workflows.g.nodes[1].config.context.required===true,"Context node metadata was not preserved");
  console.info("node-model.test.js: OK");
})();
