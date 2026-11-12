(function(){
const C=window.CELS_CONFIG,D=window.CELS_DATA,$=(s,r)=>(r||document).querySelector(s);
const mem=(()=>{try{return JSON.parse(window.name)||{}}catch(e){return{}}})();
const store={get:(k,d)=>{try{const v=sessionStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){}return mem[k]!==undefined?mem[k]:d},
set:(k,v)=>{mem[k]=v;try{window.name=JSON.stringify(mem)}catch(e){}try{sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}},
clear:()=>{Object.keys(mem).forEach(k=>delete mem[k]);try{window.name=""}catch(e){}try{sessionStorage.clear()}catch(e){}}};
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const toMin=t=>{const[a,b]=t.split(":");return+a*60+ +b},fmt=m=>{const h=Math.floor(m/60),mm=String(m%60).padStart(2,"0");return(h%12||12)+":"+mm+(h<12?" AM":" PM")};
const O=window.CELS_OCT;const SB=window.CELS_SB||null;
const course=id=>O.courses[id]?{id,...O.courses[id]}:null;
const allCourses=()=>Object.keys(O.courses).map(id=>({id,...O.courses[id],program:O.module,parts:[]}));
const section=id=>O.sections.find(s=>s.id===id);
const enrolled=u=>{const o=store.get("enr",{}),b=D.enrollments.filter(e=>e.user===u.id).map(e=>({section:e.section,status:(o[e.section]||{}).status||e.status}));Object.keys(o).forEach(k=>{if(o[k].user===u.id&&!b.some(x=>x.section===k))b.push({section:k,status:o[k].status})});return b};
const slotsOf=cid=>{const r=[];O.grid.forEach((day,d)=>day.forEach((groups,p)=>{if(groups.some(g=>g.includes(cid)))r.push([d,p+1])}));return r};
const classEvents=u=>enrolled(u).filter(e=>e.status==="active").flatMap(e=>{const s=section(e.section),c=O.courses[s.course];return slotsOf(s.course).map(([d,p])=>({title:c.name,weekday:d,start:O.periods[p][0],end:O.periods[p][1],type:"course",color:c.color,teacher:s.teacher,room:s.room,level:s.level,section:s.section,from:O.start,to:O.end}))});
const events=u=>classEvents(u).concat(O.dates.map(d=>({title:d.label,date:d.date,allDay:true,type:"event"})),store.get("bookings",[]).filter(b=>b.user===u.id).map(b=>({title:b.label+(b.status==="pending_payment"?" (pending payment)":""),date:b.date,start:b.start,end:b.end,type:"appointment",kind:b.type,color:O.colors[b.type],teacher:b.provider,bid:b.id,pending:b.status==="pending_payment",locked:b.status==="booked"&&b.type==="one-on-one"})));
const pages={};
const E={sb:SB,C,D,O,store,DAYS,fmt,toMin,course,allCourses,section,enrolled,slotsOf,events,pages};
window.CELS=E;

E.refreshBadge=()=>{const b=document.getElementById("bdg");if(!b)return;const n=E.unreadCount&&E.user?E.unreadCount(E.user):0;b.textContent=n>99?"99+":n;b.hidden=!n;b.setAttribute("aria-label",n+" unread messages")};
E.refreshPayBadge=async()=>{const b=document.getElementById("bdg-pay");if(!b||!SB)return;try{const r=await SB.from("appointments").select("*",{count:"exact",head:true}).eq("status","pending_payment"),n=r.count||0;b.textContent=n;b.hidden=!n;b.setAttribute("aria-label",n+" bookings pending payment")}catch(e){}};
E.signIn=(email,pw,google)=>{
 const u=C.users.find(x=>x.email.toLowerCase()===email.trim().toLowerCase());
 if(!u||(!google&&u.password!==pw))return{error:google?"Your account is not registered with CELS. Please contact the administrator.":"Incorrect email or password."};
 if(u.status!=="active")return{error:"This account is "+u.status+". Please contact the administrator."};
 store.set("cels",{id:u.id,role:u.role,demo:true});return{url:u.role+"/dashboard.html"};
};
E.signOut=async()=>{store.clear();try{if(SB)await SB.auth.signOut()}catch(e){}location.href="../index.html"};

function shell(role,page,u){
 const tm=role==="teacher"&&typeof E.topbar==="function",nav=C.nav[role],label=(nav.find(n=>n[0]===page)||[0,page])[1];
 document.title=label+" | CELS Portal";
 document.body.innerHTML=`<div class="shell"><nav class="side" aria-label="Main"><img class="brand" src="../assets/img/cels-logo.jpeg" alt="CELS">${nav.map(n=>`<a href="${n[0]}.html" class="${n[0]===page?"on":""}"><span>${n[2]}</span>${n[1]}${n[0]==="inbox"||n[0]==="messages"?'<em class="bdg" id="bdg" hidden></em>':(n[0]==="appointments"&&role==="admin"?'<em class="bdg" id="bdg-pay" hidden></em>':"")}</a>`).join("")}<small style="color:#8fa0b2;font-size:10px;margin-top:auto">v20</small><a href="#" class="out" id="so" style="margin-top:0"><span>🚪</span>Sign out</a></nav>${tm?`<div class="main t-main">${E.topbar(u)}<div class="t-body">`:'<div class="main">'}<div class="col"><h1>${label}</h1><p class="sub">Welcome, ${u.nickname}</p><div id="app"></div></div><aside class="rail" id="rail"></aside>${tm?"</div></div>":"</div>"}</div>`;
 $("#so").onclick=e=>{e.preventDefault();E.signOut()};
 E.user=u;E.refreshBadge();E.refreshPayBadge();if(tm&&E.teacherInit)E.teacherInit(u);
}
const panel=(t,items,empty)=>`<div class="panel"><h3>${t}</h3>${items.length?items.map(i=>`<div class="item">${i}</div>`).join(""):`<small>${empty||"Nothing yet"}</small>`}</div>`;
E.panel=panel;
E.boot=async function(){
 const b=document.body,role=b.dataset.role,page=b.dataset.page,s=store.get("cels");let u=null;
 if(s&&s.demo&&s.role===role)u=C.users.find(x=>x.id===s.id);
 else if(SB){try{const{data}=await SB.auth.getSession();if(data.session){const{data:p}=await SB.from("profiles").select("*").eq("id",data.session.user.id).maybeSingle();
  if(p&&p.status==="active"&&p.role===role)u={id:p.id,role:p.role,email:p.email,status:p.status,nickname:p.nickname||p.first_name,first:p.first_name,middle:p.middle_name,last:p.last_name,studentNumber:p.student_number,level:p.cels_level,employeeNumber:p.employee_number,department:p.department}}}catch(e){}}
 if(!u){location.href="../index.html";return}
 shell(role,page,u);
 const fn=pages[role+"/"+page];
 if(fn)fn($("#app"),u);else $("#app").innerHTML=`<div class="empty">This page is ready for content.<br><small>Register a renderer: <code>CELS.pages["${role}/${page}"]=function(el,user){...}</code> in assets/js/pages/${role}.js</small></div>`;
};
})();
