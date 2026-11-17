/* Schedule engine. One place that works out where each teacher is, so nothing is double-booked, and totals teacher hours.
   Reads the term files (classes, EEE activities, Free Talk / 1-on-1 availability, dated pre-bookings) and this browser's bookings.
   Times are Philippine local time, minutes after midnight internally. Exposes CELS.sched. */
(function(){
 const E=window.CELS;if(!E||!E.TERMS)return;
 const AL=(window.CELS_FACULTY&&window.CELS_FACULTY.aliases)||{},canon=n=>AL[n]||n; /* nicknames from data/faculty.js, e.g. Zie = Fritzie */
 const m=t=>{const[a,b]=t.split(":");return +a*60+ +b},hm=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0"),
  wd=d=>(new Date(d+"T12:00:00").getDay()+6)%7,r2=n=>Math.round(n*100)/100,
  iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"),
  termsOn=d=>E.TERMS.filter(t=>d>=t.start&&d<=t.end),
  names=s=>String(s||"").split(/\s*(?:,|&|\band\b)\s*/).map(x=>x.trim()).filter(Boolean),
  KIND={"free-talk":"Free Talk","one-on-one":"1-on-1"};
 const dates=(a,b)=>{const out=[];for(let d=new Date(a+"T12:00:00"),e=new Date(b+"T12:00:00");d<=e;d.setDate(d.getDate()+1)){if((d.getDay()+6)%7<5)out.push(iso(d))}return out};
 /* Everything a teacher is committed to on a date: classes, EEE activities, dated pre-bookings, bookings made in this browser. */
 const busy=(t,date)=>{const w=wd(date),out=[];
  termsOn(date).forEach(T=>{
   if(w<5)T.sections.forEach(s=>{if(canon(s.teacher)!==t)return;E.slotsOf(s.course,T).forEach(([d,p])=>{if(d===w)out.push({kind:"class",s:m(T.periods[p][0]),e:m(T.periods[p][1]),label:T.courses[s.course].name+" "+s.level+s.section,ref:s.id})})});
   (T.acts||[]).forEach(a=>{if(a.date===date&&names(a.teacher).map(canon).includes(t))out.push({kind:"activity",s:m(a.start),e:m(a.end),label:a.title})});
   ((T.ft&&T.ft.booked)||[]).forEach(b=>{if(b.date===date&&b.teacher===t){const sl=T.ft.slots[b.slot],ty=b.slot<(T.ft.nFree||8)?"free-talk":"one-on-one";out.push({kind:ty,s:m(sl[0]),e:m(sl[1]),label:KIND[ty]+" ("+b.who+")",id:[ty,t,date,sl[0]].join("|"),pre:true})}})});
  (E.store.get("bookings",[])||[]).forEach(b=>{if(canon(b.provider)===t&&b.date===date&&b.type!=="student-buddy"&&b.status!=="cancelled")out.push({kind:b.type,s:m(b.start),e:m(b.end),label:(KIND[b.type]||b.type)+" booking",id:b.id})});
  return out};
 /* Anything that overlaps [s,e) for this teacher. Pass {ignoreId} to leave out the booking being checked. */
 const check=(t,date,s,e,o)=>{o=o||{};const S=typeof s==="string"?m(s):s,N=typeof e==="string"?m(e):e;return busy(t,date).filter(x=>x.s<N&&x.e>S&&!(o.ignoreId&&x.id===o.ignoreId))};
 /* Free Talk / 1-on-1 times the sheet marks open, each with whatever it collides with. */
 const offered=(t,date)=>{const w=wd(date),out=[];termsOn(date).forEach(T=>{const st=((T.ft&&T.ft.days[w])||{})[t];if(!st)return;T.ft.slots.forEach((sl,i)=>{if(st[i]!=="o")return;const s=m(sl[0]),e=m(sl[1]),ty=i<(T.ft.nFree||8)?"free-talk":"one-on-one",id=[ty,t,date,sl[0]].join("|");out.push({kind:ty,i,s,e,id,label:KIND[ty]+" availability",blocked:check(t,date,s,e,{ignoreId:id})})})});return out};
 const teachers=()=>{const s=new Set();E.TERMS.forEach(T=>{T.sections.forEach(x=>s.add(canon(x.teacher)));Object.keys((T.ft&&T.ft.days[0])||{}).forEach(n=>s.add(n))});return[...s].sort((a,b)=>a.localeCompare(b))};
 /* Hours between two dates. Open times that collide with a class or activity are not counted, so nothing is counted twice. */
 const hours=(t,from,to)=>{const r={class:0,activity:0,ftOffered:0,ftBooked:0,ooOffered:0,ooBooked:0};
  dates(from,to).forEach(d=>{busy(t,d).forEach(x=>{const h=(x.e-x.s)/60;if(x.kind==="class")r.class+=h;else if(x.kind==="activity")r.activity+=h;else if(x.kind==="free-talk")r.ftBooked+=h;else if(x.kind==="one-on-one")r.ooBooked+=h});
   offered(t,d).forEach(o=>{if(o.blocked.length)return;const h=(o.e-o.s)/60;if(o.kind==="free-talk")r.ftOffered+=h;else r.ooOffered+=h})});
  Object.keys(r).forEach(k=>r[k]=r2(r[k]));r.committed=r2(r.class+r.activity+r.ftBooked+r.ooBooked);r.obligation=r2(r.class+r.activity+r.ftOffered+r.ooOffered);return r};
 /* Double bookings between two dates, grouped so a weekly pattern shows once with its dates. */
 const audit=(from,to)=>{const groups=new Map(),T=teachers(),known=new Set(T),add=(key,rec,d)=>{let g=groups.get(key);if(!g){g=Object.assign({dates:[]},rec);groups.set(key,g)}g.dates.push(d)};
  const ds=dates(from,to);
  ds.forEach(d=>{const w=wd(d);T.forEach(t=>{const b=busy(t,d);
   for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){const x=b[i],y=b[j];if(x.s<y.e&&y.s<x.e){const s=Math.max(x.s,y.s),e=Math.min(x.e,y.e);add(["clash",t,w,x.label,y.label,s,e].join("|"),{type:"clash",teacher:t,day:w,what:x.label+" and "+y.label,kinds:[x.kind,y.kind].sort().join(" + "),from:s,to:e},d)}}
   offered(t,d).forEach(o=>{if(o.blocked.length){const c=o.blocked[0];add(["offered",t,w,o.kind,o.s,c.label].join("|"),{type:"offered",teacher:t,day:w,what:o.label+" overlaps "+c.label,kinds:o.kind,from:o.s,to:o.e},d)}})})});
  const un=new Set();E.TERMS.forEach(Tm=>(Tm.acts||[]).forEach(a=>{if(a.date>=from&&a.date<=to)names(a.teacher).forEach(n=>{if(!known.has(canon(n)))un.add(n)})}));
  const all=[...groups.values()];return{clashes:all.filter(g=>g.type==="clash"),offered:all.filter(g=>g.type==="offered"),unmatched:[...un].sort()}};
 const summary=(from,to)=>{const a=audit(from,to),n={};a.clashes.concat(a.offered).forEach(g=>n[g.teacher]=(n[g.teacher]||0)+1);return teachers().map(t=>Object.assign({teacher:t,conflicts:n[t]||0},hours(t,from,to)))};
 const csv=(from,to)=>{const q=v=>'"'+String(v).replace(/"/g,'""')+'"',H=["Teacher","Class hours","Activity hours","Free Talk offered","Free Talk booked","1-on-1 offered","1-on-1 booked","Committed hours","Obligation hours","Conflicts"];
  return[H].concat(summary(from,to).map(r=>[r.teacher,r.class,r.activity,r.ftOffered,r.ftBooked,r.ooOffered,r.ooBooked,r.committed,r.obligation,r.conflicts])).map(r=>r.map(q).join(",")).join("\r\n")};
 /* Choices for the period picker: each term, each week, and everything. */
 const ranges=()=>{const out=[],mon=d=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()-((x.getDay()+6)%7));return iso(x)},add=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return iso(x)};
  const lo=E.TERMS.map(t=>t.start).sort()[0],hi=E.TERMS.map(t=>t.end).sort().pop();
  out.push({id:"all",label:"Everything loaded ("+lo+" to "+hi+")",from:lo,to:hi});
  E.TERMS.forEach(t=>out.push({id:t.key,label:t.module+" ("+t.start+" to "+t.end+")",from:t.start,to:t.end}));
  for(let d=mon(lo);d<=hi;d=add(d,7))out.push({id:"w"+d,label:"Week of "+d,from:d,to:add(d,4)});
  return out};
 E.sched={busy,check,offered,hours,audit,summary,csv,ranges,teachers,dates,hm,wd};
})();
