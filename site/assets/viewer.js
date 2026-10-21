'use strict';
(function(root){
 function graph(n,edges){
  const incoming=Array.from({length:n},()=>new Set()),outgoing=Array.from({length:n},()=>new Set()),pairs=new Map();
  for(const e of edges){
   if(!Number.isInteger(e.from)||!Number.isInteger(e.to)||e.from<0||e.to>=n||e.from>=e.to)throw new Error('Expected forward step edges');
   incoming[e.to].add(e.from);outgoing[e.from].add(e.to);
   const k=`${e.from}:${e.to}`;if(!pairs.has(k))pairs.set(k,{from:e.from,to:e.to,facts:[]});
   if(!pairs.get(k).facts.includes(e.entity))pairs.get(k).facts.push(e.entity);
  }
  return {incoming,outgoing,edges:[...pairs.values()]};
 }
 function reachable(adj,start){const seen=new Set([start]),stack=[start];while(stack.length){const i=stack.pop();for(const j of adj[i])if(!seen.has(j)){seen.add(j);stack.push(j);}}return seen;}
 function through(g,start){
  if(!Number.isInteger(start)||start<0||start>=g.incoming.length)throw new Error('Step outside trace');
  const upstream=reachable(g.incoming,start),downstream=reachable(g.outgoing,start),nodes=new Set([...upstream,...downstream]);
  // Do not include shortcuts that bypass the selected step.
  const edges=g.edges.filter(e=>(upstream.has(e.from)&&upstream.has(e.to))||(downstream.has(e.from)&&downstream.has(e.to)));
  return {nodes,edges,upstream,downstream};
 }
 function layout(nodes,edges){
  const ids=[...nodes].sort((a,b)=>a-b),rank=new Map(ids.map(i=>[i,0])),parents=new Map(ids.map(i=>[i,[]])),children=new Map(ids.map(i=>[i,[]]));
  for(const e of edges){parents.get(e.to).push(e.from);children.get(e.from).push(e.to);}
  for(const i of ids)for(const j of children.get(i))rank.set(j,Math.max(rank.get(j),rank.get(i)+1));
  const levels=[];for(const i of ids){const r=rank.get(i);(levels[r]??=[]).push(i);}
  const order=new Map();const update=()=>levels.forEach(level=>level.forEach((id,j)=>order.set(id,j)));update();
  // Stable barycenter ordering reduces crossings without inventing edges or geometry.
  for(let pass=0;pass<4;pass++){
   const reverse=pass%2,sequence=reverse?[...levels].reverse():levels;
   for(const level of sequence){const score=i=>{const near=(reverse?children:parents).get(i);return near.length?near.reduce((s,j)=>s+order.get(j),0)/near.length:order.get(i);};const scores=new Map(level.map(i=>[i,score(i)]));level.sort((a,b)=>scores.get(a)-scores.get(b)||a-b);update();}
  }
  const nodeWidth=132,nodeHeight=64,colGap=46,rowGap=22,pad=28,maxRows=Math.max(1,...levels.map(x=>x.length));
  const width=Math.max(360,levels.length*(nodeWidth+colGap)-colGap+2*pad),height=Math.max(220,maxRows*(nodeHeight+rowGap)-rowGap+2*pad+100),positions=new Map();
  levels.forEach((level,r)=>level.forEach((id,j)=>positions.set(id,{x:pad+r*(nodeWidth+colGap),y:pad+100+(maxRows-level.length)*(nodeHeight+rowGap)/2+j*(nodeHeight+rowGap),rank:r})));
  return {positions,levels,width,height,nodeWidth,nodeHeight};
 }
 // Paths contain real prerequisite edges only. Ties keep the first path in step order.
 function longest(g,selected=null){
  const n=g.incoming.length,before=Array.from({length:n},(_,i)=>[i]),after=Array.from({length:n},(_,i)=>[i]);
  for(let i=0;i<n;i++)for(const j of g.incoming[i])if(before[j].length+1>before[i].length)before[i]=[...before[j],i];
  for(let i=n-1;i>=0;i--)for(const j of g.outgoing[i])if(after[j].length+1>after[i].length)after[i]=[i,...after[j]];
  return selected===null?before.reduce((a,b)=>b.length>a.length?b:a,[]):[...before[selected],...after[selected].slice(1)];
 }
 function shortest(g,from,to){
  const paths=new Map([[from,[from]]]),queue=[from];
  for(const i of queue){if(i===to)return paths.get(i);for(const j of g.outgoing[i])if(!paths.has(j)){paths.set(j,[...paths.get(i),j]);queue.push(j);}}
  return [];
 }
 function longestBetween(g,from,to){
  const paths=new Map([[from,[from]]]);
  for(let i=from;i<=to;i++)if(paths.has(i))for(const j of g.outgoing[i])if(j<=to&&(!paths.has(j)||paths.get(i).length+1>paths.get(j).length))paths.set(j,[...paths.get(i),j]);
  return paths.get(to)||[];
 }
 function comparison(g,selected=null,from=null,to=null){
  const paired=from!==null&&to!==null;
  const long=paired?longestBetween(g,from,to):longest(g,selected);
  if(!long.length)return {long,short:[],from,to,via:null};
  const start=long[0],end=long.at(-1),via=paired?null:selected;
  const short=via===null?shortest(g,start,end):[...shortest(g,start,via),...shortest(g,via,end).slice(1)];
  return {long,short,from:start,to:end,via};
 }
 // With free endpoints, every shortest non-empty path through a step is incident to it.
 function shortestInvolving(g,selected){
  if(selected===null)return [];
  if(!Number.isInteger(selected)||selected<0||selected>=g.incoming.length)throw new Error('Step outside trace');
  return g.edges.filter(e=>e.from===selected||e.to===selected).sort((a,b)=>a.from-b.from||a.to-b.to).map(e=>[e.from,e.to]);
 }
 const api={graph,through,layout,longest,shortest,longestBetween,comparison,shortestInvolving};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BranchGraph=api;
})(typeof globalThis!=='undefined'?globalThis:this);

'use strict';
const data=window.TRAJECTORIES,$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let route,task,episode,g,selected=null,inspected=null,zoom='fit',currentLayout,degreeMode='out';
function hash(){return '#'+new URLSearchParams({view:'longest',...(selected===null?{}:{step:selected+1}),...(degreeMode==='in'?{degree:'in'}:{})});}
function settings(){const q=new URLSearchParams(location.hash.slice(1)),s=q.get('step');selected=s&&/^\d+$/.test(s)&&Number(s)>=1&&Number(s)<=episode.steps.length?Number(s)-1:null;inspected=selected;degreeMode=q.get('degree')==='in'?'in':'out';}
function commit(){const next=hash();if(location.hash===next)render();else location.hash=next;}
function navigate(i){selected=i;inspected=i;commit();}
function successDescription(t){
 const descriptions={
  pick_and_place:'The requested object is placed in or on the requested destination.',
  pick_clean_then_place_in_recep:'The requested object is cleaned and then placed in or on the requested destination.',
  pick_cool_then_place_in_recep:'The requested object is cooled and then placed in or on the requested destination.',
  pick_heat_then_place_in_recep:'The requested object is heated and then placed in or on the requested destination.',
  pick_two_obj_and_place:'Two distinct objects of the requested type are placed in or on the requested destination.',
  look_at_obj_in_light:'The requested object is held while the requested lamp is used to inspect it.'
 };
 return descriptions[t.type]||'The task instruction is satisfied.';
}
function load(){try{
 route=ReviewRoutes.read(location.search,data);
 if(route.condition==='aggregated')throw new Error('This path prototype displays one recorded trace. Use an episode ID and condition=highlight or condition=pure.');
 task=data.tasks.find(t=>t.id===route.taskId);episode=task.episodes.find(e=>e.id===route.id);
 g=BranchGraph.graph(episode.steps.length,episode.edges.filter(e=>e.relation==='state_precondition'));
 settings();$('#goal').textContent=task.goal;let success=$('#success-description');if(!success){success=document.createElement('p');success.id='success-description';$('#goal').after(success);}success.innerHTML='<strong>Success means:</strong> '+esc(successDescription(task));success.hidden=false;$('#error').hidden=true;$('#graph').hidden=false;document.title=`${episode.id} · Prerequisite paths · ALFWorld`;render();
 }catch(e){if($('#success-description'))$('#success-description').hidden=true;$('#goal').textContent='Visualization unavailable';$('#error').textContent=e.message;$('#error').hidden=false;$('#graph').hidden=true;}}
function title(s){const a=s.parsedAction;return a?[a.verb==='go'?'go to':a.verb,a.object||a.target||'']:[s.action?'unrecognized':'empty command',''];}
function inspect(){
 if(inspected===null)return '';
 const s=episode.steps[inspected],links=route.condition==='highlight'?g.edges.filter(e=>e.from===inspected||e.to===inspected):[];
 return `<article class="step-detail"><h2>Step ${inspected+1} <code>${esc(s.action||'[empty recorded action]')}</code></h2><p><span class="field-label">Environment response</span>${esc(s.obs)}</p>${route.condition==='highlight'?`<div class="detail-counts">${g.incoming[inspected].size} direct ${g.incoming[inspected].size===1?'prerequisite':'prerequisites'} · ${g.outgoing[inspected].size} direct ${g.outgoing[inspected].size===1?'dependent':'dependents'}</div>${s.stateChanges.length?`<ul>${s.stateChanges.map(c=>`<li>${esc(c.fact)}: ${esc(c.before)} → ${esc(c.after)}</li>`).join('')}</ul>`:''}<div class="fact-links">${links.map(e=>`<button data-step="${e.to===inspected?e.from:e.to}">${e.to===inspected?'←':'→'} Step ${(e.to===inspected?e.from:e.to)+1}<span>${esc(e.facts.join('; '))}</span></button>`).join('')||'<span>No supported prerequisite links for this step.</span>'}</div>`:''}</article>`;
}
function applyZoom(){
 const svg=$('#branch-svg');if(!svg)return;
 const scale=zoom==='fit'?Math.min(1,Math.max(.25,($('#graph-viewport').clientWidth-20)/currentLayout.width)):zoom;
 svg.style.width=`${currentLayout.width*scale}px`;svg.style.height=`${currentLayout.height*scale}px`;
 $('#zoom-label').textContent=Math.round(scale*100)+'%';
}
function render(){
 if(route.condition==='pure'||route.condition==='h'){renderPure();return;}
 const pair=BranchGraph.comparison(g,selected),path=pair.long,short=pair.short;
 const activeNodes=new Set(path),shortNodes=new Set(short),activeEdges=new Set(path.slice(1).map((j,i)=>`${path[i]}:${j}`));
 const n=episode.steps.length,width=Math.max(700,n*30+50),height=365,y=170,x=i=>30+i*(width-60)/Math.max(1,n-1);currentLayout={width,height};
 function arc(e,below=false,active=false){const a=x(e.from),b=x(e.to),rise=Math.min(195,45+Math.sqrt(b-a)*7),direction=below?1:-1;return `<path class="branch-edge ${below?'shortest-edge':''} ${active?'active':''}" data-from="${e.from}" data-to="${e.to}" d="M${a},${y} C${a},${y+direction*rise} ${b},${y+direction*rise} ${b},${y}" marker-end="url(#${below?'short-arrow':'arrow'})"><title>${below?'Shortest':'Prerequisite'}: step ${e.from+1} → ${e.to+1}${e.facts?': '+esc(e.facts.join('; ')):''}</title></path>`;}
 const curves=g.edges.filter(e=>activeEdges.has(`${e.from}:${e.to}`)).map(e=>arc(e,false,true)).join('')+short.slice(1).map((to,i)=>arc(g.edges.find(e=>e.from===short[i]&&e.to===to),true,true)).join('');
 const degrees=(degreeMode==='in'?g.incoming:g.outgoing).map(neighbors=>neighbors.size);
 const maxDegree=Math.max(0,...degrees),opacity=d=>.2+.8*d/Math.max(1,maxDegree);
 const degreeLegend=[...new Set([0,Math.ceil(maxDegree/2),maxDegree])].map(d=>`<span><i style="background:rgba(36,123,116,${opacity(d)})"></i>${d}</span>`).join('');
 const cards=episode.steps.map((s,i)=>`<g class="branch-node ${i===selected?'selected':''} ${activeNodes.has(i)?'on-path':''} ${shortNodes.has(i)?'on-shortest':''} ${s.invalid?'invalid':''}" tabindex="0" role="button" aria-label="Step ${i+1}: ${esc(s.action)}${activeNodes.has(i)?' · highlighted path':''}" aria-pressed="${i===selected}" data-in-degree="${g.incoming[i].size}" data-out-degree="${g.outgoing[i].size}" data-step="${i}" transform="translate(${x(i)},${y})"><title>Step ${i+1}: ${esc(s.action)} · In-degree: ${g.incoming[i].size} direct prerequisites · Out-degree: ${g.outgoing[i].size} direct dependents</title><rect class="hit-area" x="-13" y="-13" width="26" height="50" style="fill:transparent;stroke:none;pointer-events:all"/><rect class="degree-node" x="-7" y="-7" width="14" height="14" rx="2" style="fill:#247b74;fill-opacity:${opacity(degrees[i])}"/>${s.invalid?'<rect class="invalid-overlay" x="-7" y="-7" width="14" height="14" rx="2"/>':''}<text class="step-number" text-anchor="middle" x="0" y="29">${i+1}</text></g>`).join('');
 const count=p=>`${Math.max(0,p.length-1)} ${p.length===2?'edge':'edges'}`;

 function pathList(name,steps,kind){return `<details class="path-list ${kind}" open><summary>${name} path · ${steps.length} ${steps.length===1?'step':'steps'} · ${count(steps)}</summary><ol>${steps.map(i=>`<li><button data-inspect="${i}" aria-current="${inspected===i?'step':'false'}"><span>Step ${i+1}</span><code>${esc(episode.steps[i].action||'[empty recorded action]')}</code></button></li>`).join('')||'<li>No directed path.</li>'}</ol></details>`;}
 $('#graph').innerHTML=`<div class="branch-legend"><span><i class="edge-key"></i>Longest · above</span><span><i class="edge-key shortest-key"></i>Shortest · below</span><span>Outlined node = selected step</span><span>Hatching = invalid / no effect</span></div><div class="degree-legend"><label>Node fill <select id="degree-select" aria-label="Node fill degree"><option value="out" ${degreeMode==='out'?'selected':''}>Dependents (out-degree)</option><option value="in" ${degreeMode==='in'?'selected':''}>Prerequisites (in-degree)</option></select></label>${degreeLegend}<span>Darker = more directly linked steps · full trace</span></div><div class="canvas-heading"><span>All ${n} steps · execution order →</span><div class="zoom-controls"><button id="zoom-out" aria-label="Zoom out">−</button><span id="zoom-label"></span><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-fit">Fit width</button></div></div><div class="graph-viewport" id="graph-viewport" tabindex="0" aria-label="All recorded steps in execution order"><svg id="branch-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Single trace prerequisite paths"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="context-stroke"/></marker><marker id="short-arrow" markerWidth="5" markerHeight="5" refX="5" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5" fill="#bd920b"/></marker><pattern id="node-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0 V6" stroke="#b27c4f"/></pattern></defs><line x1="${x(0)}" y1="${y}" x2="${x(n-1)}" y2="${y}" stroke="#cbd3cc"/>${curves}${cards}</svg></div><p class="graph-note">Click a step to see its paths; click it again to reset. Shortest uses the longest path’s endpoints. Paths are dependencies, not complete action plans.</p><div class="path-lists">${pathList('Longest',path,'long-list')}${pathList('Shortest',short,'short-list')}</div><div id="step-detail-host">${inspect()}</div><p class="outcome">Recorded outcome: ${episode.won?'won':'not won'} · ${n} recorded steps · prerequisites only</p>`;
 $('#degree-select').onchange=e=>{degreeMode=e.target.value;commit();};
 bindSteps();
 const rescale=factor=>{zoom=Math.max(.25,Math.min(2,$('#branch-svg').getBoundingClientRect().width/width*factor));applyZoom();};
 $('#zoom-out').onclick=()=>rescale(1/1.25);$('#zoom-in').onclick=()=>rescale(1.25);$('#zoom-fit').onclick=()=>{zoom='fit';applyZoom();};applyZoom();
}
function inspectStep(i){
 inspected=i;
 $('#step-detail-host').innerHTML=inspect();
 document.querySelectorAll('[data-inspect]').forEach(el=>el.setAttribute('aria-current',Number(el.dataset.inspect)===i?'step':'false'));
 bindSteps();
}
function bindSteps(){
 document.querySelectorAll('[data-inspect]').forEach(el=>{el.onclick=()=>inspectStep(Number(el.dataset.inspect));});
 document.querySelectorAll('[data-step]').forEach(el=>{
  const activate=()=>{
   const i=Number(el.dataset.step);
   if(el.tagName.toLowerCase()==='g'&&selected===i){selected=null;inspected=null;commit();}
   else navigate(i);
  };
  el.onclick=activate;
  if(el.tagName.toLowerCase()==='g')el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};
 });
}
function renderPure(){
 const path=route.condition==='h'?BranchGraph.longest(g):[];
 const pathSteps=new Set(path.length>1?path:[]);
 const note=route.condition==='h'?(pathSteps.size?'Teal steps = key steps. Click a step to read its observation.':'No key steps identified. Click a step to read its observation.'):'Recorded actions · click a step to read its observation.';
 $('#graph').innerHTML=`<p class="graph-note">${note}</p><div class="pure-steps">${episode.steps.map((s,i)=>`<button class="${pathSteps.has(i)?'longest-step':''}" data-step="${i}" aria-pressed="${selected===i}" aria-label="Step ${i+1}: ${esc(s.action||'[empty]')}${pathSteps.has(i)?' · key step':''}"><span>${i+1} · ${esc(s.action||'[empty]')}</span>${pathSteps.has(i)?'<span class="path-badge">Key step</span>':''}</button>`).join('')}</div><div id="step-detail-host">${inspect()}</div>`;bindSteps();
}

window.addEventListener('hashchange',()=>{if(episode){settings();zoom='fit';render();}});
window.addEventListener('popstate',load);window.addEventListener('resize',()=>{if(zoom==='fit')applyZoom();});load();
