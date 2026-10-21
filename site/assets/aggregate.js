// Section 2 PTA renderer, extracted from prototypes/aggregate-template.html.
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function hue(f,tint){ // share of runs that won: 0 = coral, .5 = amber, 1 = teal; tint mixes toward white
 const stops=[[216,90,48],[239,159,39],[29,158,117]];const t=f<.5?f*2:(f-.5)*2;const [a,b]=f<.5?[stops[0],stops[1]]:[stops[1],stops[2]];
 return `rgb(${a.map((v,i)=>Math.round((v+(b[i]-v)*t)*(1-tint)+255*tint)).join(',')})`;}
function buildGraph(runs,field,tree){
 const nodes=[],index=new Map(),links=new Map();
 const get=(parent,d,key)=>{const k=tree?`${parent}|${key}`:`${d}|${key}`;if(!index.has(k)){index.set(k,nodes.length);nodes.push({id:nodes.length,key,depth:d,runs:[],won:0,ends:[],tail:[],parents:new Set()});}return index.get(k);};
 const start=get(-1,0,'start');
 for(const r of runs){let cur=start,pending=0;nodes[cur].runs.push(r.id);nodes[cur].won+=r.won;const toks=r[field];
  toks.forEach(([key,i],d)=>{const nxt=d+1<toks.length?toks[d+1][1]:r.n;if(key==='search'){pending+=nxt-i;return;}
   const nid=get(cur,nodes[cur].depth+1,key);nodes[nid].runs.push(r.id);nodes[nid].won+=r.won;nodes[nid].parents.add(cur);
   const lk=`${cur}>${nid}`;if(!links.has(lk))links.set(lk,{from:cur,to:nid,runs:[],won:0,gap:[]});const L=links.get(lk);L.runs.push(r.id);L.won+=r.won;L.gap.push(pending);pending=0;cur=nid;});
  nodes[cur].ends.push(r.id);nodes[cur].tail.push(pending);}
 return {nodes,links:[...links.values()]};
}
function selectRuns(T){
 const f=$('#ptaruns').value,byId=[...T.runs].sort((a,b)=>a.id.localeCompare(b.id));
 if(f==='won')return T.runs.filter(r=>r.won);if(f==='lost')return T.runs.filter(r=>!r.won);
 if(/^\d+$/.test(f))return byId.slice(0,+f);return T.runs;
}
function drawGraph(svg,T,runs,field,layout,mode,allWon){
 const {nodes,links}=buildGraph(runs,field,layout==='tree');
 const total=runs.length||1,mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0,p0=runs.filter(r=>r.won).length/total;
 const score=o=>{const n=o.runs.length;return mode==='damped'?(o.won+2*p0)/(n+2):mode==='winners'?(allWon?o.won/allWon:0):mode==='all'?n/total:(n?o.won/n:0);};
 const cols=[];nodes.forEach(n=>{(cols[n.depth]??=[]).push(n);});
 const order=new Map();cols.forEach(col=>{col.sort((a,b)=>{const ba=mean([...a.parents].map(p=>order.get(p)??0)),bb=mean([...b.parents].map(p=>order.get(p)??0));return ba-bb||b.runs.length-a.runs.length;});col.forEach((n,i)=>order.set(n.id,i));});
 const W=156,colW=W+70,top=20,left=16,gapY=12,hN=n=>12+20*n.runs.length/total;
 const colH=cols.map(col=>col.reduce((s,n)=>s+hN(n)+gapY,0)-gapY),height=top+Math.max(...colH)+40;
 const Y=new Map();cols.forEach((col,d)=>{let y=top+(height-top-30-colH[d])/2;col.forEach(n=>{Y.set(n.id,y+hN(n)/2);y+=hN(n)+gapY;});});
 const width=left+cols.length*colW+60;const X=n=>left+n.depth*colW;
 svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('width',width);svg.setAttribute('height',height);
 let h='';
 links.forEach(L=>{const p=nodes[L.from],n=nodes[L.to],x1=X(p)+W,x2=X(n),y1=Y.get(p.id),y2=Y.get(n.id),g=mean(L.gap);
  h+=`<path d="M${x1},${y1} C${x1+28},${y1} ${x2-28},${y2} ${x2},${y2}" fill="none" stroke="${hue(score(L),.3)}" stroke-opacity=".8" stroke-width="${1+8*L.runs.length/total}" ${g>=1?'stroke-dasharray="6 3"':''}><title>${L.runs.length} runs · ${L.won} won · ${g.toFixed(0)} exploration steps on average before "${esc(n.key)}"</title></path>`;});
 nodes.forEach(n=>{const x=X(n),yy=Y.get(n.id),hh=hN(n);const frac=score(n);
  const div=[...n.parents].some(pid=>nodes[pid].won>0)&&n.won===0;const label=n.key;
  const endShare=n.runs.length?n.ends.length/n.runs.length:0,tint=.78-.6*endShare,dark=endShare>.55;
  h+=`<g class="node" data-id="${n.id}" role="button" tabindex="0" aria-label="${esc(n.key)} at depth ${n.depth}, ${n.runs.length} runs, ${n.won} won"><rect x="${x}" y="${yy-hh/2}" width="${W}" height="${hh}" rx="5" fill="${hue(frac,tint)}" stroke="${div?'var(--red)':hue(frac,0)}" stroke-width="${div?2:.8}"/><text class="tm" x="${x+6}" y="${yy+4}" style="font-size:10px;${dark?'fill:#fff':''}">${esc(label.length>26?label.slice(0,25)+'…':label)}</text><text class="ts" x="${x+W-10}" y="${yy+4}" text-anchor="end" style="font-size:10px;${dark?'fill:#fff':''}">${n.runs.length}</text>`;
  if(n.ends.length){const wins=n.ends.filter(id=>T.runs.find(r=>r.id===id).won).length,tail=mean(n.tail),bh=Math.max(6,hh*endShare);
   h+=`<rect x="${x+W-6}" y="${yy+hh/2-bh}" width="6" height="${bh}" rx="2" fill="${hue(wins/n.ends.length,0)}"><title>${n.ends.length} of ${n.runs.length} runs end here · ${wins} won · ${tail.toFixed(0)} more exploration steps on average</title></rect><text class="ts" x="${x+W}" y="${yy+hh/2+11}" text-anchor="end" style="font-size:9.5px">${n.ends.length} end</text>`;}
  h+=`<title>${esc(n.key)} · depth ${n.depth} · ${n.runs.length} runs, ${n.won} won${div?' · divergence from winning runs':''}\n${n.runs.join(', ')}</title></g>`;
 });
 svg.innerHTML=h;
 const choose=id=>{const n=nodes.find(n=>n.id===id);document.querySelectorAll('#ptagraphs .node').forEach(el=>el.classList.toggle('selected',el.closest('svg')===svg&&+el.dataset.id===id));$('#detail').innerHTML=`<b>${esc(n.key)}</b> · depth ${n.depth} · ${n.runs.length} runs (${n.won} won)`;};
 svg.querySelectorAll('.node').forEach(el=>{el.onclick=()=>choose(+el.dataset.id);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(+el.dataset.id);}};});
 return {nodes,links};
}
function pta(T){
 const src=$('#ptasrc').value,field=src==='pta_dep'?'dep_tokens':'tokens',layout=$('#ptalayout').value,mode=$('#ptacolor').value,split=$('#ptasplit').checked;
 const runs=selectRuns(T),allWon=runs.filter(r=>r.won).length;
 $('#colorlegend').textContent={cond:'win rate of the runs through the node: none → half → all',damped:'win rate shrunk toward the task rate (2 pseudo-runs): a 1-of-1 node is no longer pure teal',winners:'share of all winning runs that pass through: none → half → all (0 for tasks without wins)',all:'share of the selected runs that pass through: few → half → all'}[mode];
 const groups=split?[['won',runs.filter(r=>r.won)],['lost',runs.filter(r=>!r.won)]].filter(g=>g[1].length):[['',runs]];
 if(!runs.length){$('#ptagraphs').innerHTML='<p class="pta-empty">No runs match this filter.</p>';$('#detail').textContent='';$('#ptastat').textContent=`0 of ${T.runs.length} runs`;return;}
 const box=$('#ptagraphs');box.innerHTML=groups.map(([name,rs],i)=>`${name?`<h3 class="ptahead">${name} · ${rs.length} run${rs.length===1?'':'s'}</h3>`:''}<div class="scroll" tabindex="0" role="region" aria-label="Scrollable aggregated action graph"><svg id="pta${i}"></svg></div>`).join('');
 $('#detail').textContent='';
 const stats=groups.map(([name,rs],i)=>{const g=drawGraph($(`#pta${i}`),T,rs,field,layout,mode,allWon);return `${name?name+': ':''}${g.nodes.length} nodes · ${g.links.length} links`;});
 $('#ptastat').textContent=`${runs.length} of ${T.runs.length} runs · ${layout==='tree'?'Exact prefixes':'Merged by depth'} · `+stats.join(' · ');
}


export function renderAggregate(task){
 $('#goal').textContent=task.task;document.title=`${task.id} · Aggregated paths · ALFWorld`;
 $('#graph').innerHTML="<section id=\"pta-panel\" aria-label=\"Aggregated canonical action paths\">\n<p class=\"pta-intro\"><span id=\"ptastat\"></span> \u00b7 Select a node to see its summary.</p>\n<details class=\"pta-settings\"><summary>Display settings</summary><div class=\"controls\"><label>Token source <select id=\"ptasrc\"><option value=\"pta\">task milestones (hand-written)</option><option value=\"pta_dep\">dependency graph (task-agnostic)</option></select></label><label>Layout <select id=\"ptalayout\"><option value=\"merged\">merged by depth (flow graph)</option><option value=\"tree\">prefix tree (exact prefixes)</option></select></label><label>Color <select id=\"ptacolor\"><option value=\"cond\">win rate of runs through the node</option><option value=\"damped\">win rate, damped for small counts</option><option value=\"winners\">share of all winners passing through</option><option value=\"all\">share of all runs passing through</option></select></label><label>Runs <select id=\"ptaruns\"><option value=\"all\">all 16</option><option value=\"won\">won only</option><option value=\"lost\">lost only</option><option value=\"4\">first 4 sampled</option><option value=\"8\">first 8 sampled</option><option value=\"12\">first 12 sampled</option></select></label><label><input type=\"checkbox\" id=\"ptasplit\"> split won / lost</label></div><p class=\"pta-help\">Task milestones keep task-relevant actions using fixed rules. Dependency tokens keep steps touched by inferred prerequisite or lineage edges. Object instance numbers are omitted. Merged-by-depth layout joins equal actions at equal depths; exact-prefix layout preserves separate histories. These are action patterns, not equivalent world states.</p></details>\n<div class=\"legend\"><span><i class=\"pta-gradient\"></i><span id=\"colorlegend\"></span></span><span>Node height / line width = runs</span><span>Darker / end bar = runs ending here</span><span>Dashed line = folded exploration</span><span>Red border = no winners after a branch with winners</span></div>\n<div id=\"ptagraphs\"></div><div id=\"detail\" aria-live=\"polite\"></div>\n</section>";
 $('#graph').hidden=false;$('#error').hidden=true;
 for(const id of ['ptasrc','ptalayout','ptacolor','ptaruns','ptasplit'])$('#'+id).onchange=()=>pta(task);
 pta(task);
}
