/* Teacher photo badges and profile cards (Free Talk and 1-on-1 booking). Needs data/faculty.js; without it the pages keep the initials badges. */
(function(){
 const E=window.CELS,F=window.CELS_FACULTY;if(!E||!F)return;
 const P=F.people||{},SITE=F.site,AL=F.aliases||{},canon=n=>AL[n]||n;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const hue=n=>"hsl("+([...n].reduce((a,c)=>a+c.charCodeAt(0),0)*37%360)+" 45% 42%)",ini=n=>n.replace(/\(.*\)/,"").trim().slice(0,2).toUpperCase();
 const label=n=>"View profile: "+(P[n]?P[n].name:n);
 const badge=(n,big,click)=>{const p=P[n];return `<span class="av fp-av${big?" fp-big":""}"${click?` role="button" tabindex="0" data-fp="${esc(n)}" title="${esc(label(n))}" aria-label="${esc(label(n))}"`:""} style="background:${hue(n)}">${esc(ini(n))}${p?`<img src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:""}</span>`};
 const classes=n=>E.openTerms().flatMap(t=>t.sections.filter(s=>canon(s.teacher)===n).map(s=>t.courses[s.course].name+" (Level "+s.level+", Section "+s.section+", Room "+s.room+")"));
 const aka=n=>Object.keys(AL).filter(k=>AL[k]===n).join(", ");
 let ov=null,prev=null;
 const close=()=>{if(!ov)return;ov.remove();ov=null;document.removeEventListener("keydown",key,true);if(prev&&prev.focus)prev.focus()};
 const key=e=>{if(e.key==="Escape"){e.preventDefault();close();return}
  if(e.key==="Tab"&&ov){const f=[...ov.querySelectorAll("button,a[href]")];if(!f.length)return;const i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}};
 const open=n=>{close();prev=document.activeElement;const p=P[n],cl=classes(n);
  ov=document.createElement("div");ov.className="fp-ov";
  ov.innerHTML=`<div class="fp-card" role="dialog" aria-modal="true" aria-label="Teacher profile: ${esc(n)}"><button class="fp-x" aria-label="Close">&times;</button><div class="fp-head">${badge(n,true,false)}<div><h3>${esc(p?p.name:n)}</h3><div class="fp-role">${esc(p?p.role:"Teacher")}${aka(n)?" &middot; also called "+esc(aka(n)):""}</div></div></div>${cl.length?`<h4>Classes this term</h4><ul>${cl.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}${p?"":`<p class="fp-note">No photo or profile is on file for ${esc(n)} yet.</p>`}<div class="fp-acts">${p&&p.url?`<a class="fp-btn" href="${esc(p.url)}" target="_blank" rel="noopener">Full profile</a>`:""}<a class="fp-btn alt" href="${esc(SITE)}" target="_blank" rel="noopener">CELS faculty page</a></div></div>`;
  document.body.appendChild(ov);document.addEventListener("keydown",key,true);ov.querySelector(".fp-x").focus()};
 document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-fp]");
  if(t&&!t.closest(".fp-ov")){e.preventDefault();e.stopPropagation();open(t.dataset.fp);return}
  if(ov&&(e.target===ov||e.target.closest(".fp-x")))close()},true);
 document.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches(".fp-av[data-fp]")){e.preventDefault();e.stopPropagation();open(e.target.dataset.fp)}},true);
 E.fp={av:n=>badge(n,false,true),link:n=>`<a href="#" class="fp-link" data-fp="${esc(n)}">${esc(n)}</a>`,open,close,has:n=>!!P[n]};
})();
