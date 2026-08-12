(function(){
  "use strict";

  const NODE_TYPES = Object.freeze({
    LLM: "llm", TOOL: "tool", HUMAN: "human",
    ROUTER: "router", PARALLEL: "parallel", MERGE: "merge",
    CONDITION: "condition", LOOP: "loop",
    INSTRUCTION: "instruction", SOP: "sop", CHECKLIST: "checklist", REFERENCE: "reference"
  });

  const NODE_META = Object.freeze({
    llm:{label:"LLM",icon:"🤖",group:"execution"}, tool:{label:"TOOL",icon:"🔗",group:"execution"}, human:{label:"HUMAN",icon:"👤",group:"execution"},
    router:{label:"ROUTER",icon:"🔀",group:"control"}, parallel:{label:"PARALLEL",icon:"⚡",group:"control"}, merge:{label:"MERGE",icon:"🔗",group:"control"},
    condition:{label:"CONDITION",icon:"❓",group:"control"}, loop:{label:"LOOP",icon:"🔁",group:"control"},
    instruction:{label:"INSTRUCTION",icon:"🧭",group:"context"}, sop:{label:"SOP",icon:"📖",group:"context"}, checklist:{label:"CHECKLIST",icon:"⚠️",group:"context"}, reference:{label:"REFERENCE",icon:"🔎",group:"context"}
  });

  const api = window.ChainIndexFolderState;
  if (!api) return;
  const originalMigrate = api.migrateState;
  const uid = () => window.crypto && crypto.randomUUID ? crypto.randomUUID() : "node-" + Date.now().toString(36) + Math.random().toString(36).slice(2,8);

  function normalizeNode(raw, index){
    const n = raw && typeof raw === "object" ? raw : {};
    const type = NODE_META[n.type] ? n.type : "llm";
    return {
      id: n.id || uid(), type, title: n.title || (index != null ? "Schritt " + (index + 1) : "Node"),
      config: n.config && typeof n.config === "object" ? n.config : {},
      input: n.input == null ? "" : n.input, output: n.output == null ? "" : n.output,
      metadata: n.metadata && typeof n.metadata === "object" ? n.metadata : {}
    };
  }

  function migrateWorkflow(workflow){
    if (!workflow || typeof workflow !== "object") return workflow;
    const legacy = Array.isArray(workflow.steps) ? workflow.steps : [];
    let nodes = Array.isArray(workflow.nodes) ? workflow.nodes.map(normalizeNode) : [];
    if (!nodes.length && legacy.length){
      nodes = legacy.map((step, i) => normalizeNode({
        id: step.id, type: step.type || "llm", title: step.title,
        input: step.input, output: step.output,
        config: Object.assign({}, step.config || {}, {
          template: step.template || "",
          collapsed: !!step.collapsed,
          chainToNext: !!step.chainToNext
        }), metadata: step.metadata || {}
      }, i));
    }
    if (!nodes.length) nodes = [normalizeNode({title:"Schritt 1"},0)];

    // Keep the old linear editor as a compatibility projection. New graph data
    // is authoritative when present, while legacy steps remain available.
    if (!Array.isArray(workflow.edges) || !workflow.edges.length){
      workflow.edges = [];
      for (let i=0;i<nodes.length-1;i++) workflow.edges.push({id:uid(),source:nodes[i].id,target:nodes[i+1].id,condition:null});
    } else {
      workflow.edges = workflow.edges.map(e => ({id:e.id||uid(),source:e.source,target:e.target,condition:e.condition == null ? null : e.condition}));
    }
    workflow.nodes = nodes;
    workflow.nodes.forEach((node,i) => {
      const old = legacy[i];
      if (old){
        old.id = node.id;
        old.type = node.type;
        old.title = node.title;
        old.input = node.input;
        old.output = node.output || old.output || "";
        old.config = node.config;
        old.metadata = node.metadata;
      }
    });
    if (!legacy.length){
      workflow.steps = nodes.map(node => ({
        id:node.id,title:node.title,type:node.type,input:node.input,template:node.config.template || "",output:node.output || "",
        collapsed:!!node.config.collapsed,chainToNext:!!node.config.chainToNext,config:node.config,metadata:node.metadata
      }));
    }
    workflow.graphVersion = 1;
    return workflow;
  }

  api.migrateState = function(input){
    const state = originalMigrate(input);
    Object.values(state.workflows || {}).forEach(migrateWorkflow);
    return state;
  };

  function typeOptions(current){
    return Object.keys(NODE_META).map(type => '<option value="'+type+'" '+(type===current?'selected':'')+'>'+NODE_META[type].icon+' '+NODE_META[type].label+'</option>').join("");
  }

  function injectStyles(){
    if (document.getElementById("nodeModelStyles")) return;
    const s=document.createElement("style"); s.id="nodeModelStyles";
    s.textContent=`
      .node-type-control{display:flex;align-items:center;gap:7px;margin-left:2px}
      .node-type-select{max-width:145px;padding:5px 7px;border-radius:7px;border:1px solid var(--border);background:var(--bg-elevated);font-size:11px;color:var(--text-secondary)}
      .node-type-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:7px;background:var(--accent-soft);color:var(--accent);font-size:10px;font-weight:600;letter-spacing:.3px}
      .node-context-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-soft)}
      .node-context-fields label{font-size:10px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.35px}
      .node-context-fields input,.node-context-fields textarea{min-height:auto;padding:8px 10px;font-size:12px}
      .node-context-fields textarea{grid-column:1/-1;min-height:70px}
      .node-architecture-note{padding:9px 11px;margin-bottom:10px;border:1px dashed var(--border);border-radius:8px;color:var(--text-tertiary);font-size:11px}
      @media(max-width:640px){.node-context-fields{grid-template-columns:1fr}.node-type-select{max-width:118px}}
    `; document.head.appendChild(s);
  }

  function activeState(){ try { return api.migrateState(JSON.parse(localStorage.getItem("pcb-state-v1")||"{}")); } catch(e){ return null; } }
  function save(state){ localStorage.setItem("pcb-state-v1", JSON.stringify(api.migrateState(state))); }

  function decorate(){
    injectStyles();
    const cards=document.querySelectorAll(".step-card");
    cards.forEach(card=>{
      if(card.querySelector(".node-type-control")) return;
      const index=Number(card.dataset.index);
      const state=activeState(); const workflow=state && state.workflows && state.workflows[state.activeWorkflowId];
      const node=workflow && workflow.nodes && workflow.nodes[index];
      if(!node) return;
      const header=card.querySelector(".step-header");
      const actions=card.querySelector(".step-header-actions");
      if(!header||!actions) return;
      const control=document.createElement("div"); control.className="node-type-control";
      control.innerHTML='<span class="node-type-badge">'+NODE_META[node.type].icon+' '+NODE_META[node.type].label+'</span><select class="node-type-select" aria-label="Node-Typ">'+typeOptions(node.type)+'</select>';
      header.insertBefore(control,actions);
      control.querySelector("select").addEventListener("change",function(){
        const s=activeState(); const w=s && s.workflows && s.workflows[s.activeWorkflowId]; if(!w||!w.nodes[index]) return;
        const type=this.value; w.nodes[index].type=type; if(w.steps&&w.steps[index]) w.steps[index].type=type;
        if(type==="sop"||type==="instruction"||type==="checklist"||type==="reference"){
          w.nodes[index].config.context = Object.assign({description:"",url:"",label:"",required:false}, w.nodes[index].config.context||{});
        }
        save(s); decorate();
      });
      if(["sop","instruction","checklist","reference"].includes(node.type)) addContextFields(card,index,node);
      if(node.type!=="llm") addArchitectureNote(card,node);
    });
  }

  function addArchitectureNote(card,node){
    if(card.querySelector(".node-architecture-note")) return;
    const body=card.querySelector(".step-body"); if(!body) return;
    const note=document.createElement("div"); note.className="node-architecture-note";
    note.textContent = NODE_META[node.type].group === "execution" ? "Execution Node · Ausführung ist in diesem Chunk bewusst noch nicht implementiert." : NODE_META[node.type].group === "control" ? "Control Node · Kontrollfluss wird später durch den Workflow-Graphen ausgewertet." : "Context Node · Prozesswissen, keine Ausführung.";
    body.prepend(note);
  }

  function addContextFields(card,index,node){
    const body=card.querySelector(".step-body"); if(!body||card.querySelector(".node-context-fields")) return;
    const ctx=Object.assign({description:"",url:"",label:"",required:false},node.config&&node.config.context||{});
    const box=document.createElement("div"); box.className="node-context-fields";
    box.innerHTML='<label>Beschreibung<input data-k="description" value="'+esc(ctx.description)+'"></label><label>Label<input data-k="label" value="'+esc(ctx.label)+'"></label><label>URL<input data-k="url" value="'+esc(ctx.url)+'"></label><label>Required <input data-k="required" type="checkbox" '+(ctx.required?'checked':'')+'></label>';
    body.prepend(box);
    box.addEventListener("change",function(e){
      const s=activeState(); const w=s&&s.workflows&&s.workflows[s.activeWorkflowId]; if(!w||!w.nodes[index])return;
      const c=w.nodes[index].config.context||(w.nodes[index].config.context={}); const el=e.target; c[el.dataset.k]=el.type==="checkbox"?el.checked:el.value;
      if(w.steps&&w.steps[index]) w.steps[index].config=w.nodes[index].config; save(s);
    });
  }
  function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#39;")}

  window.ChainIndexNodeModel={NODE_TYPES,NODE_META,migrateWorkflow,normalizeNode};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",decorate); else decorate();
  new MutationObserver(function(){ decorate(); }).observe(document.body,{childList:true,subtree:true});
})();
