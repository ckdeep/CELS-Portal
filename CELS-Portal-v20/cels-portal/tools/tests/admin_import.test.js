const {JSDOM, ResourceLoader, VirtualConsole} = require("jsdom");
const fs=require("fs"),path=require("path"),vm=require("vm"),XLSX=require("xlsx");
const ROOT=require("path").resolve(__dirname,"../..");
class Loader extends ResourceLoader{fetch(url){if(url.startsWith("http://localhost/")){const p=path.join(ROOT,decodeURIComponent(url.slice(17).split("?")[0]));return Promise.resolve(fs.existsSync(p)?fs.readFileSync(p):Buffer.from(""))}return Promise.resolve(Buffer.from(""))}}
const chain=(data)=>{const o={select:()=>o,eq:()=>o,in:()=>o,order:()=>o,limit:()=>o,then:(r,j)=>Promise.resolve({data,error:null}).then(r,j)};return o};
const rd=(f,v)=>{const s={window:{}};vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(ROOT,"data",f),"utf8"),s);return s.window[v]};
const NOV=rd("november.js","CELS_NOV"),DEC=rd("december.js","CELS_DEC");
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log("  FAIL:",m)}};
(async()=>{
  const file=path.join(ROOT,"admin/courses.html");
  const dom=await require("jsdom").JSDOM.fromFile(file,{url:"http://localhost/admin/courses.html",runScripts:"dangerously",resources:new Loader(),virtualConsole:new VirtualConsole(),pretendToBeVisual:true,
    beforeParse(w){w.XLSX=XLSX;w.CELS_SB={from:()=>chain([]),auth:{getSession:async()=>({data:{session:null}})},rpc:async()=>({data:null,error:null})};}});
  await new Promise(r=>dom.window.addEventListener("load",r));await new Promise(r=>setTimeout(r,150));
  const parse=dom.window.CELS&&dom.window.CELS.adminTools&&dom.window.CELS.adminTools.parseSchedule;
  ok(!!parse,"Admin parseSchedule is reachable");
  const cases=[["nov2026.xlsx",NOV,"nov2026"],["dec2026-week1.xlsx",DEC[0],"dec2026w1"],["dec2026-week2.xlsx",DEC[1],"dec2026w2"]];
  for(const [f,T,id] of cases){
    const wb=XLSX.readFile(path.join(ROOT,"tools/admin-import",f));
    const r=await parse(wb);
    ok(r&&r.err&&r.err.length===0,f+": Admin validator accepts the file "+(r&&r.err||[]).join(" | "));
    const p=r.payload; if(!p) continue;
    ok(p.term.id===id&&p.term.starts_on===T.start&&p.term.ends_on===T.end,f+": term id/dates match the portal data");
    ok(p.sections.length===T.sections.length,f+": "+p.sections.length+" sections = portal "+T.sections.length);
    const key=s=>[s.course||s.course_id,s.level,s.section,s.room,s.teacher||s.teacher_name].join("|");
    const A=p.sections.map(key).sort(),B=T.sections.map(key).sort();
    ok(JSON.stringify(A)===JSON.stringify(B),f+": every section (course, level, section, room, teacher) is identical to the Student portal data");
    const mt=new Set(p.meetings.map(m=>[m.course_id,m.weekday,m.period].join("|"))),gt=new Set();
    T.grid.forEach((day,d)=>day.forEach((groups,pi)=>groups.forEach(g=>g.forEach(c=>{if(T.courses[c])gt.add([c,d,pi+1].join("|"))}))));
    ok(mt.size===gt.size&&[...mt].every(x=>gt.has(x)),f+": "+mt.size+" meeting rows = grid ("+gt.size+")");
    ok(p.key_dates.length===T.dates.length&&p.key_dates.every(k=>T.dates.some(d=>d.label===k.label&&d.date===k.on_date)),f+": key dates identical");
    ok(p.courses.length===Object.keys(T.courses).length,f+": courses identical ("+p.courses.length+")");
  }
  // data-integrity checks across all generated data
  for(const [name,T] of [["nov",NOV],["dec1",DEC[0]],["dec2",DEC[1]]]){
    const ids=T.sections.map(s=>s.id);ok(new Set(ids).size===ids.length,name+": no duplicate section ids");
    const keys=T.sections.map(s=>[s.course,s.level,s.section].join("|"));ok(new Set(keys).size===keys.length,name+": no duplicate course/level/section");
    ok(T.sections.every(s=>T.courses[s.course]),name+": every section's course exists");
    ok(T.days.every(d=>{const x=new Date(d+"T12:00:00").getDay();return x>=1&&x<=5&&d>=T.start&&d<=T.end}),name+": all days are weekdays inside the term");
    const bk=(T.ft.booked||[]).map(b=>[b.date,b.teacher,b.slot].join("|"));ok(new Set(bk).size===bk.length,name+": no duplicate pre-booked slot");
    ok((T.ft.booked||[]).every(b=>T.days.includes(b.date)),name+": every pre-booking date is inside the term");
  }
  // student-portal view of the three students/teachers: every section of NOV appears at the right times (grid) -- teacher timetable derived from data
  console.log("RESULT admin/data checks:",pass,"passed,",fail,"failed");process.exit(fail?1:0);
})().catch(e=>{console.error("HARNESS ERROR",e);process.exit(2)});
