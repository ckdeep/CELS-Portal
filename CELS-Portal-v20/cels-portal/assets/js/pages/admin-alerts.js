/* Admin > Alerts: what needs the admin's attention, worked out live from the database. Read-only: nothing here writes anything.
   1. scores under 60%          2. teachers below 2/3 of the month's load (teaching / prep / events, targets set by the admin each month)
   3. new classes with no teacher or room       4. level change requests       5. students with 2 or more unexcused absences (country shown, for marketing)
   6. reminder when a month's load targets are not set yet
   Tables used (already used by the portal): profiles, sections, courses, terms, course_meetings, periods, school_events, event_assignments, curriculum_duties,
   grade_items, grade_scores, attendance_sessions, attendance_records (status "absent" = unexcused), level_change_requests.
   One new table, monthly_load_targets (see docs/db-changes-draft.sql): the only thing this page writes, and only when the admin saves targets.
   Hours are worked out the same way as the Workload page. */
(function(){
 const E=window.CELS;if(!E)return;
 const CFG={pass:60,absences:2,newDays:14,remindFrom:20},MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
 const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const txt=v=>v==null?"":String(v).trim(),lc=v=>txt(v).toLowerCase(),pad=n=>String(n).padStart(2,"0");
 const isoD=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const nm=p=>p.nickname||[p.first_name,p.last_name].filter(Boolean).join(" ")||p.email||"(unknown student)";
 const md=d=>new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
 const q=async p=>{const r=await p;if(r.error)throw r.error;return r.data||[]};
 const fetchAll=async()=>{const g=t=>q(E.sb.from(t).select("*"));
  const [profiles,sections,courses,terms,items,scores,sessions,records,levels,meetings,periods,events,assign,duties]=await Promise.all(["profiles","sections","courses","terms","grade_items","grade_scores","attendance_sessions","attendance_records","level_change_requests","course_meetings","periods","school_events","event_assignments","curriculum_duties"].map(g));
  let targets=[],targetsError=null;try{targets=await q(E.sb.from("monthly_load_targets").select("*"))}catch(e){targetsError=e}
  return{profiles,sections,courses,terms,items,scores,sessions,records,levels,meetings,periods,events,assign,duties,targets,targetsError}};
 /* Hours per teacher in a month, the same way the Workload page works them out: class periods x class days in the month (days of events that cancel classes are left out),
    curriculum duty hours for the month, and event hours for events that overlap the month. Names are matched ignoring upper/lower case. */
 const m5=v=>String(v||"").slice(0,5),mins=v=>{const[a,b]=m5(v).split(":");return+a*60+ +b},hrs=(a,b)=>(mins(b)-mins(a))/60,r2=n=>Math.round(n*100)/100,wdOf=d=>(new Date(d+"T12:00:00").getDay()+6)%7;
 const loads=(db,month)=>{const y=+month.slice(0,4),mo=+month.slice(5,7),nd=new Date(y,mo,0).getDate(),first=month+"-01",last=month+"-"+pad(nd),days=[...Array(nd)].map((_,i)=>month+"-"+pad(i+1)),cancel=new Set(),out={};
  (db.events||[]).filter(e=>e.cancels_classes).forEach(e=>days.forEach(d=>{if(d>=e.starts_on&&d<=e.ends_on)cancel.add(d)}));
  const occ={};db.terms.forEach(t=>{const o=[0,0,0,0,0];days.forEach(d=>{const w=wdOf(d);if(w<5&&d>=t.starts_on&&d<=t.ends_on&&!cancel.has(d))o[w]++});occ[t.id]=o});
  const PD=Object.fromEntries((db.periods||[]).map(p=>[p.period,p])),get=n=>out[lc(n)]||(out[lc(n)]={name:txt(n),teaching:0,prep:0,events:0});
  db.sections.filter(s=>s.active!==false&&txt(s.teacher_name)).forEach(s=>(db.meetings||[]).filter(m=>m.term_id===s.term_id&&m.course_id===s.course_id).forEach(m=>{const p=PD[m.period];if(p)get(s.teacher_name).teaching+=hrs(p.starts_at,p.ends_at)*((occ[s.term_id]||[0,0,0,0,0])[m.weekday]||0)}));
  (db.duties||[]).filter(x=>x.month===month&&txt(x.teacher_name)).forEach(x=>{get(x.teacher_name).prep+=Number(x.hours)||0});
  const evIn=new Set((db.events||[]).filter(e=>e.ends_on>=first&&e.starts_on<=last).map(e=>e.id));
  (db.assign||[]).filter(x=>evIn.has(x.event_id)&&txt(x.teacher_name)).forEach(x=>{get(x.teacher_name).events+=Number(x.hours)||0});
  Object.values(out).forEach(o=>{o.teaching=r2(o.teaching);o.prep=r2(o.prep);o.events=r2(o.events)});return out};
 const monthLabel=m=>MN[+m.slice(5,7)-1]+" "+m.slice(0,4),addMonth=(m,n)=>{const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+n,1,12);return d.getFullYear()+"-"+pad(d.getMonth()+1)};
 const CATS=[["teaching","Teaching","teaching_hours"],["prep","Prep","prep_hours"],["events","Events","event_hours"]];
 /* Marketing managers by country. Optional: window.CELS_MARKETING=[{country,name,email}] (do not put real emails in a public file). */
 const contactFor=c=>c?((window.CELS_MARKETING||[]).find(m=>lc(m.country)===lc(c))||null):null;
 const compute=(db,o)=>{o=o||{};const today=o.today||isoD(new Date()),terms=db.terms.slice().sort((a,b)=>String(a.starts_on).localeCompare(String(b.starts_on)));
  const term=(o.termId&&terms.find(t=>t.id===o.termId))||terms.find(t=>t.starts_on<=today&&today<=t.ends_on)||terms.filter(t=>t.starts_on<=today).pop()||terms[0]||null;
  const act=db.sections.filter(s=>s.active!==false),inTerm=act.filter(s=>!term||s.term_id===term.id),secById=Object.fromEntries(inTerm.map(s=>[s.id,s]));
  const cname=Object.fromEntries(db.courses.map(c=>[c.id,c.name])),prof=Object.fromEntries(db.profiles.map(p=>[p.id,p])),termById=Object.fromEntries(terms.map(t=>[t.id,t]));
  const label=s=>(cname[s.course_id]||s.course_id)+" "+s.level+s.section;
  // 1. scores under the pass mark (score / max points, strictly below 60%)
  const item=Object.fromEntries(db.items.map(i=>[i.id,i])),low=[];
  db.scores.forEach(r=>{const it=item[r.item_id],s=it&&secById[it.section_id],max=Number(it&&it.max_points);if(!s||r.score==null||r.score===""||!(max>0))return;
   if(Number(r.score)*100<CFG.pass*max)low.push({student:prof[r.student_id]||{id:r.student_id},section:s,label:label(s),item:it,score:Number(r.score),max,pct:Math.round(Number(r.score)/max*1000)/10})});
  low.sort((a,b)=>a.pct-b.pct);
  // 3. classes (in a term that has not ended) with no teacher or no room
  const nowMs=Date.parse(today+"T12:00:00");
  const unst=act.filter(s=>{const t=termById[s.term_id];return(!t||t.ends_on>=today)&&(!txt(s.teacher_name)||!txt(s.room))}).map(s=>({section:s,label:label(s),needTeacher:!txt(s.teacher_name),needRoom:!txt(s.room),isNew:!!s.created_at&&(nowMs-Date.parse(s.created_at))/864e5<=CFG.newDays,term:termById[s.term_id]}));
  // 4. level change requests waiting for a decision
  const levels=db.levels.filter(r=>r.status==="pending").map(r=>({req:r,student:prof[r.student_id]||{id:r.student_id}}));
  // 2. teachers below 2/3 of the month's load targets (teaching / prep / events), when the admin has set them for that month
  const month=o.month||today.slice(0,7),tRow=(db.targets||[]).find(t=>t.month===month)||null,load=loads(db,month);
  const tgt=tRow?Object.fromEntries(CATS.map(c=>[c[0],Number(tRow[c[2]])||0])):null;
  const inactive=new Set(db.profiles.filter(p=>p.role==="teacher"&&p.status&&p.status!=="active").map(p=>lc(p.nickname))),pop={};
  db.profiles.filter(p=>p.role==="teacher"&&(!p.status||p.status==="active")&&txt(p.nickname)).forEach(p=>{pop[lc(p.nickname)]={name:txt(p.nickname),teaching:0,prep:0,events:0}});
  Object.keys(load).forEach(k=>{if(!inactive.has(k)||pop[k])pop[k]=Object.assign({},pop[k]||{},load[k])});
  const light=tgt?Object.values(pop).map(t=>({name:t.name,cats:CATS.filter(c=>tgt[c[0]]>0&&t[c[0]]*3<2*tgt[c[0]]).map(c=>({key:c[0],label:c[1],actual:t[c[0]],target:tgt[c[0]],pct:Math.round(t[c[0]]/tgt[c[0]]*100)}))})).filter(t=>t.cats.length).sort((x,y)=>Math.min(...x.cats.map(c=>c.pct))-Math.min(...y.cats.map(c=>c.pct))||x.name.localeCompare(y.name)):[];
  // 6. reminders: this month's targets are missing; next month's too once it is close (from the 20th)
  const miss=[];if(!tRow&&month===today.slice(0,7))miss.push(month);const nx=addMonth(today.slice(0,7),1);if(+today.slice(8,10)>=CFG.remindFrom&&!(db.targets||[]).some(t=>t.month===nx))miss.push(nx);
  // 5. students with N or more unexcused absences in the term
  const n=o.absences>0?Number(o.absences):CFG.absences,sess=db.sessions.filter(x=>secById[x.section_id]&&(!term||(x.held_on>=term.starts_on&&x.held_on<=term.ends_on))),sessById=Object.fromEntries(sess.map(x=>[x.id,x])),by={};
  db.records.forEach(r=>{if(r.status!=="absent")return;const x=sessById[r.session_id];if(!x)return;(by[r.student_id]=by[r.student_id]||[]).push({date:x.held_on,label:label(secById[x.section_id])})});
  const abs=Object.keys(by).filter(id=>by[id].length>=n).map(id=>{const st=prof[id]||{id},items=by[id].sort((a,b)=>a.date<b.date?-1:1);return{student:st,count:items.length,items,country:txt(st.country)||null,contact:contactFor(st.country)}}).sort((a,b)=>b.count-a.count||nm(a.student).localeCompare(nm(b.student)));
  return{term,terms,low,unst,levels,light,month,targets:tgt,tRow,load,miss,abs,absN:n,total:low.length+unst.length+light.length+abs.length+miss.length}};
 const mailto=a=>{const c=a.contact;if(!c||!c.email)return"";const body="Student: "+nm(a.student)+(a.student.student_number?" ("+a.student.student_number+")":"")+"\nCountry: "+a.country+"\nUnexcused absences: "+a.count+"\n"+a.items.map(i=>"- "+md(i.date)+", "+i.label).join("\n");
  return"mailto:"+encodeURIComponent(c.email)+"?subject="+encodeURIComponent("CELS: "+nm(a.student)+" has "+a.count+" unexcused absences")+"&body="+encodeURIComponent(body)};
 const panel=(color,title,n,body)=>`<div class="panel" style="border-left:6px solid ${n?color:"#2e8b57"}"><h3>${title} <small>(${n})</small></h3>${body}</div>`;
 const none=t=>`<small>${t}</small>`;
 const missingTable=e=>e&&(e.code==="42P01"||/monthly_load_targets/.test(e.message||"")&&/exist|schema cache/i.test(e.message||""));
 const saveTargets=async(month,v)=>{const row={month,teaching_hours:Number(v.teaching)||0,prep_hours:Number(v.prep)||0,event_hours:Number(v.events)||0,note:txt(v.note)||null,updated_at:new Date().toISOString()};
  if(!/^\d{4}-\d{2}$/.test(month))throw new Error("Choose a month.");if([row.teaching_hours,row.prep_hours,row.event_hours].some(n=>n<0))throw new Error("Hours cannot be negative.");
  const r=await E.sb.from("monthly_load_targets").upsert(row,{onConflict:"month"});if(r&&r.error)throw r.error;return row};
 E.pages["admin/alerts"]=async el=>{
  if(!E.sb){el.innerHTML='<div class="empty">Alerts are worked out from the live database, which is not connected in demo mode.</div>';return}
  let db,termId="",absN="",month="",tmonth="",msg="";
  const today=()=>isoD(new Date());
  const draw=()=>{month=month||today().slice(0,7);tmonth=tmonth||month;const a=compute(db,{termId,month,absences:absN}),T=a.term,cur=today().slice(0,7);
   const months=[...new Set([].concat(db.terms.flatMap(t=>{const r=[];for(let m=t.starts_on.slice(0,7);m<=t.ends_on.slice(0,7)&&r.length<48;m=addMonth(m,1))r.push(m);return r}),[addMonth(cur,-1),cur],[1,2,3,4,5,6].map(n=>addMonth(cur,n)),db.targets.map(t=>t.month)).filter(Boolean))].sort(),
    tRow=db.targets.find(t=>t.month===tmonth)||{},prevM=db.targets.map(t=>t.month).filter(m=>m<tmonth).sort().pop(),prev=db.targets.find(t=>t.month===prevM);
   const sel=`<div class="toolbar"><label class="f">Term (scores, absences)<select id="al_t">${a.terms.map(t=>`<option value="${esc(t.id)}"${T&&t.id===T.id?" selected":""}>${esc(t.name||t.id)} (${esc(t.starts_on)} to ${esc(t.ends_on)})</option>`).join("")||"<option>No terms</option>"}</select></label>
    <label class="f">Month (teacher load)<select id="al_m">${months.map(m=>`<option value="${m}"${m===a.month?" selected":""}>${monthLabel(m)}</option>`).join("")}</select></label>
    <label class="f">Alert at unexcused absences<input id="al_a" type="number" min="1" value="${esc(absN)}" placeholder="${CFG.absences}" style="width:110px"></label></div>
    <small>Worked out live from the database. Scores are flagged below ${CFG.pass}%. Teacher load is flagged below two thirds of the month's targets.</small>`;
   const tg=db.targetsError?(missingTable(db.targetsError)?`<div class="item"><b>One-time setup needed:</b> the monthly targets table does not exist yet. Run <code>docs/db-changes-draft.sql</code> in the Supabase SQL editor, then reload this page.</div>`:`<div class="item">Could not read the monthly targets: ${esc(db.targetsError.message||db.targetsError)}</div>`):
    `<small>Set these before each month starts. They are hours per teacher for that month: teaching (scheduled class hours), prep (curriculum development hours) and events (event coordination hours). A teacher below two thirds of a target is flagged.</small>
     <div class="toolbar"><label class="f">Month<select id="tg_m">${months.map(m=>`<option value="${m}"${m===tmonth?" selected":""}>${monthLabel(m)}${db.targets.some(t=>t.month===m)?" (set)":""}</option>`).join("")}</select></label>
     <label class="f">Teaching load (hours)<input id="tg_t" type="number" min="0" step="0.5" value="${esc(tRow.teaching_hours==null?"":tRow.teaching_hours)}" style="width:130px"></label>
     <label class="f">Prep load (hours)<input id="tg_p" type="number" min="0" step="0.5" value="${esc(tRow.prep_hours==null?"":tRow.prep_hours)}" style="width:130px"></label>
     <label class="f">Events (hours)<input id="tg_e" type="number" min="0" step="0.5" value="${esc(tRow.event_hours==null?"":tRow.event_hours)}" style="width:130px"></label>
     <label class="f">Note<input id="tg_n" value="${esc(tRow.note||"")}" style="width:220px"></label><button class="btn" id="tg_s">Save targets</button>${prev?`<button class="btn alt" id="tg_c">Copy from ${monthLabel(prevM)}</button>`:""}</div>${msg?`<div class="item">${esc(msg)}</div>`:""}`;
   const lowH=a.low.length?`<table><tr><th>Student</th><th>Class</th><th>Item</th><th>Score</th><th>%</th></tr>${a.low.slice(0,200).map(x=>`<tr><td>${esc(nm(x.student))}<br><small>${esc(x.student.student_number||"")}</small></td><td>${esc(x.label)}<br><small>${esc(x.section.teacher_name||"No teacher")}</small></td><td>${esc(x.item.name)}</td><td>${x.score} / ${x.max}</td><td><b style="color:#b3261e">${x.pct}%</b></td></tr>`).join("")}</table>${a.low.length>200?none("Showing the lowest 200."):""}`:none("No scores under "+CFG.pass+"% in this term.");
   const unH=a.unst.length?a.unst.map(x=>`<div class="item"><b>${esc(x.label)}</b> ${x.isNew?'<span style="background:#e0a100;color:#fff;border-radius:6px;padding:1px 6px;font-size:12px">new</span> ':""}needs ${[x.needTeacher?"a teacher":"",x.needRoom?"a room number":""].filter(Boolean).join(" and ")}<br><small>${esc(x.term?x.term.name||x.term.id:"")} &middot; <a href="courses.html">Open Courses to fill it in</a></small></div>`).join(""):none("Every open class has a teacher and a room.");
   const lvH=a.levels.length?a.levels.map(x=>`<div class="item"><b>${esc(nm(x.student))}</b> asks to move from ${esc(x.req.from_level)} to ${esc(x.req.requested_level)}${x.req.reason?`<br><small>${esc(x.req.reason)}</small>`:""}<br><small><a href="placement.html">Review on the Placement page</a></small></div>`).join(""):none("No level change requests waiting.");
   const ldH=!a.targets?none("No targets are set for "+monthLabel(a.month)+" yet, so teacher load cannot be checked. Set them in the panel above."):a.light.length?`<small>${monthLabel(a.month)} targets: teaching ${a.targets.teaching} h, prep ${a.targets.prep} h, events ${a.targets.events} h. Flagged: under two thirds of a target.</small>`+a.light.map(x=>`<div class="item"><b>${esc(x.name)}</b>: ${x.cats.map(c=>`${c.label} ${c.actual} of ${c.target} h (${c.pct}%)`).join(" &middot; ")}</div>`).join(""):none("Every teacher is at or above two thirds of each target for "+monthLabel(a.month)+".");
   const abH=a.abs.length?a.abs.map(x=>{const m=mailto(x);return`<div class="item"><b>${esc(nm(x.student))}</b> ${esc(x.student.student_number||"")}: ${x.count} unexcused absences<br><small>${x.items.map(i=>esc(md(i.date))+", "+esc(i.label)).join(" &middot; ")}</small><br><small>${x.country?"Country: "+esc(x.country)+". "+(x.contact?"Marketing: "+esc(x.contact.name||x.contact.email)+(m?` &middot; <a href="${m}">Email marketing</a>`:""):"No marketing manager on record for this country."):"Country not set on this student, so marketing cannot be told."}</small></div>`}).join(""):none("No student has "+a.absN+" or more unexcused absences this term.");
   const msH=a.miss.length?a.miss.map(m=>`<div class="item"><b>${monthLabel(m)}</b> has no load targets yet. Set them in the Monthly load targets panel.</div>`).join(""):none("Targets are set for the months that need them.");
   el.innerHTML=`<div class="panel"><h3>Alerts <small>(${a.total} open, plus ${a.levels.length} level request${a.levels.length===1?"":"s"})</small></h3>${sel}</div>`+
    `<div class="panel"><h3>Monthly load targets</h3>${tg}</div>`+
    panel("#e0a100","Load targets not set",a.miss.length,msH)+
    panel("#b3261e","Scores under "+CFG.pass+"%",a.low.length,lowH)+panel("#e0a100","Classes that need a teacher or room",a.unst.length,unH)+panel("#1769aa","Level change requests",a.levels.length,lvH)+
    panel("#e0a100","Teachers below 2/3 of the month's load",a.light.length,ldH)+panel("#b3261e","Students with "+a.absN+" or more unexcused absences",a.abs.length,abH);
   const on=(id,f)=>{const n=el.querySelector(id);if(n)n.onchange=f};
   on("#al_t",e=>{termId=e.target.value;draw()});on("#al_m",e=>{month=e.target.value;tmonth=month;msg="";draw()});on("#al_a",e=>{absN=e.target.value.trim();draw()});on("#tg_m",e=>{tmonth=e.target.value;msg="";draw()});
   const sv=el.querySelector("#tg_s");if(sv)sv.onclick=async()=>{try{const row=await saveTargets(tmonth,{teaching:el.querySelector("#tg_t").value,prep:el.querySelector("#tg_p").value,events:el.querySelector("#tg_e").value,note:el.querySelector("#tg_n").value});
     db.targets=db.targets.filter(t=>t.month!==tmonth).concat([row]);month=tmonth;msg="Saved the targets for "+monthLabel(tmonth)+".";draw()}catch(e){msg=missingTable(e)?"The monthly targets table does not exist yet. Run docs/db-changes-draft.sql first.":"Could not save: "+(e.message||e);draw()}};
   const cp=el.querySelector("#tg_c");if(cp)cp.onclick=()=>{el.querySelector("#tg_t").value=prev.teaching_hours;el.querySelector("#tg_p").value=prev.prep_hours;el.querySelector("#tg_e").value=prev.event_hours;el.querySelector("#tg_n").value=prev.note||""}};
  try{el.innerHTML='<div class="empty">Loading&hellip;</div>';db=await fetchAll();draw()}catch(e){el.innerHTML='<div class="empty">Could not load data: '+esc(e.message||e)+'</div>'}};
 /* One line on the dashboard's "Needs your attention" list. */
 const dashRow=async el=>{try{if(!E.sb)return;const a=compute(await fetchAll()),box=[...el.querySelectorAll(".panel")].find(p=>/Needs your attention/.test(p.textContent));if(!box)return;
  box.insertAdjacentHTML("beforeend",`<a class="todo ${a.total?"hot":""}" href="alerts.html"><i>&#128276;</i><span>Alerts: low scores, unstaffed classes, light teacher loads, absences, missing monthly targets</span><b>${a.total||"&#10003;"}</b></a>`)}catch(x){}};
 E.alerts={compute,fetchAll,dashRow,saveTargets,loads,CFG};
})();
