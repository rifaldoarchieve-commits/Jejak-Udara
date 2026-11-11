/* Advanced Analytics — fixed 2025 PM2.5 shape clustering, precomputed offline. */
'use strict';
(() => {
 const D=window.JEJAK_WDTW, DB=window.JEJAK_DATA, GEO=window.JEJAK_GEOMETRY || {};
 if(!D||!DB) return;
 const $=id=>document.getElementById(id);
 const colors=['#000000','#C7F36B','#e7ad72','#8da9e5','#e58bb4','#99d7a5','#d9a7e1'];
 let k=6, focus=3, manualFocus=false, viewMode='all';
 const safe=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
 const num=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const groups=()=>D.clusters[String(k)], rows=D.rows;
 const station=()=>rows.find(r=>r.id===$('filterStation')?.value);
 function changeStation(id){const el=$('filterStation');if(!el)return;el.value=id;manualFocus=false;viewMode='detail';el.dispatchEvent(new Event('change',{bubbles:true}));}
 function color(i){return colors[i]||'#9cdece';}
 function setCluster(id){
  focus=id;viewMode='detail';
  const g=groups().find(q=>q.id===id),current=station();
  if(g&&(!current||current['k'+k]!==id)){const medoid=rows.find(r=>r.code===g.medoid);if(medoid){changeStation(medoid.id);return;}}
  manualFocus=true;render();
 }
 function chart(){
  const root=$('adShapeChart');if(!root)return;
  const gs=groups(),g=gs.find(e=>e.id===focus)||gs[0],detail=viewMode==='detail';
  const memberRows=detail?rows.filter(r=>r['k'+k]===g.id):[];
  const series=detail?[...memberRows.map(r=>r.z),g.meansZ]:gs.map(q=>q.meansZ);
  const all=series.flat(),mn=Math.min(-2.5,...all)-.18,mx=Math.max(2.7,...all)+.18;
  const w=820,h=266,p={l:42,r:13,t:13,b:29},x=i=>p.l+i*(w-p.l-p.r)/11,y=v=>p.t+(h-p.t-p.b)*(mx-v)/(mx-mn);
  const axis=[-4,-3,-2,-1,0,1,2,3,4].filter(v=>v>=mn&&v<=mx);
  let svg=axis.map(v=>`<line x1="${p.l}" y1="${y(v)}" x2="${w-p.r}" y2="${y(v)}" stroke="#38534f" stroke-dasharray="${v===0?'0':'3 5'}" opacity=".7"/><text class="ad-axis" x="${p.l-10}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
  svg+=D.months.map((m,i)=>`<text class="ad-axis" x="${x(i)}" y="${h-6}" text-anchor="middle">${m}</text>`).join('');
  const makePath=v=>v.map((n,i)=>`${i?'L':'M'}${x(i).toFixed(2)} ${y(n).toFixed(2)}`).join(' ');
  if(!detail){
    for(const c of gs){let sel=c.id===focus,path=makePath(c.meansZ);
     svg+=`<path d="${path}" data-ad-cluster="${c.id}" fill="none" stroke="${color(c.id)}" stroke-width="${sel?3.7:2.1}" opacity="${sel?1:.48}" stroke-linejoin="round" stroke-linecap="round" style="cursor:pointer"><title>K${c.id} · rerata bentuk pola ${c.n} stasiun. Klik untuk detail anggota.</title></path>`;
     c.meansZ.forEach((z,i)=>svg+=`<circle data-ad-cluster="${c.id}" cx="${x(i)}" cy="${y(z)}" r="${sel?3.7:2.7}" fill="${color(c.id)}" opacity="${sel?1:.55}" style="cursor:pointer"><title>K${c.id} · ${D.months[i]} · Z ${num(z,2)} · klik untuk detail</title></circle>`);
    }
  }else{
    const chosen=station()?.id;
    const ordered=[...memberRows].sort((a,b)=>Number(a.id===chosen)-Number(b.id===chosen));
    for(const r of ordered){const isMedoid=r.code===g.medoid,isChosen=r.id===chosen,stroke=isChosen?'#fff3cb':color(g.id);
     svg+=`<path class="ad-station-line" data-station="${safe(r.id)}" d="${makePath(r.z)}" fill="none" stroke="${stroke}" stroke-width="${isChosen?3.2:isMedoid?2.5:1.6}" stroke-dasharray="${isMedoid&&!isChosen?'7 4':'none'}" opacity="${isChosen?1:isMedoid?.89:.42}" stroke-linejoin="round" stroke-linecap="round"><title>${safe(r.name)}${isMedoid?' · medoid':''} · klik untuk memilih stasiun</title></path>`;
    }
    svg+=`<path d="${makePath(g.meansZ)}" fill="none" stroke="${color(g.id)}" stroke-width="4.5" opacity="1" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"><title>Rata-rata Z-score anggota K${g.id}</title></path>`;
    g.meansZ.forEach((z,i)=>svg+=`<circle cx="${x(i)}" cy="${y(z)}" r="3.5" fill="${color(g.id)}" stroke="#142b2e" stroke-width="1.2" pointer-events="none"><title>Rata-rata K${g.id} · ${D.months[i]} · ${num(z,2)}</title></circle>`);
  }
  root.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${detail?'Pola Z-score per stasiun anggota klaster K'+g.id+', garis tebal rata-rata klaster':'Rata-rata pola Z-score seluruh '+gs.length+' klaster'}, Januari hingga Desember 2025">${svg}</svg>`;
  root.querySelectorAll('[data-ad-cluster]').forEach(el=>el.addEventListener('click',()=>setCluster(+el.dataset.adCluster)));
  root.querySelectorAll('[data-station]').forEach(el=>el.addEventListener('click',()=>changeStation(el.dataset.station)));
  const legend=$('adClusterLegend');
  if(!detail){legend.classList.remove('is-detail');legend.innerHTML=gs.map(c=>`<button type="button" data-ad-cluster="${c.id}" class="ad-legend-btn ${focus===c.id?'active':''}" title="Klik untuk menampilkan garis ${c.n} anggota K${c.id}"><i class="ad-color" style="background:${color(c.id)}"></i>K${c.id} · ${c.n} stasiun</button>`).join('');
   legend.querySelectorAll('button').forEach(el=>el.addEventListener('click',()=>setCluster(+el.dataset.adCluster)));
   $('adShapeFooter').textContent='Rata-rata Z-score seluruh klaster. Klik salah satu klaster untuk melihat pola tiap anggotanya.';
  }else{legend.classList.add('is-detail');legend.innerHTML=`<span class="ad-mean-chip"><i class="ad-color" style="background:${color(g.id)}"></i>RERATA K${g.id}</span>` + memberRows.map(r=>`<button class="ad-legend-btn ad-member-name ${r.id===station()?.id?'active':''}" type="button" data-ad-member="${safe(r.id)}" title="Pilih stasiun ${safe(r.name)}"><i class="ad-color" style="background:${r.id===station()?.id?'#fff3cb':color(g.id)}"></i>${r.code===g.medoid?'★ ':''}${safe(r.name)}</button>`).join('');
   legend.querySelectorAll('[data-ad-member]').forEach(el=>el.addEventListener('click',()=>changeStation(el.dataset.adMember)));
   $('adShapeFooter').textContent=`DETAIL K${g.id} · ${g.n} stasiun · medoid ${g.medoidName} (★) · garis tebal = rerata klaster · garis tipis = anggota.`;
  }
  const allBtn=$('adViewAll'), detailBtn=$('adViewDetail'), picker=$('adClusterPicker');
  allBtn.classList.toggle('active',!detail);detailBtn.classList.toggle('active',detail);
  allBtn.setAttribute('aria-pressed',String(!detail));detailBtn.setAttribute('aria-pressed',String(detail));
  detailBtn.textContent=`DETAIL K${focus}`;
  picker.innerHTML=gs.map(c=>`<option value="${c.id}">Klaster K${c.id} (${c.n})</option>`).join('');
  picker.value=String(focus);
 }
 function map(){const root=$('adMap');if(!root)return;let groupsById=new Map(rows.map(r=>[r.id,r]));const project=(lon,lat)=>[72+(lon-94)*16,291-(lat+11)*16], poly=(pts)=>pts.map((pt,i)=>{let [x,y]=project(pt[0],pt[1]);return `${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`}).join(' ')+'Z';
  let grid='';for(let lon=95;lon<=140;lon+=5){let [x]=project(lon,0);grid+=`<path class="ad-map-grid" d="M${x} 15V310"/>`}
  for(let lat=-10;lat<=5;lat+=5){let [,y]=project(0,lat);grid+=`<path class="ad-map-grid" d="M35 ${y}H880"/>`}
  let land=(GEO.Indonesia||[]).map(a=>`<path class="ad-map-land" d="${poly(a)}"/>`).join('');let neighbor=['Malaysia','Brunei','Timor-Leste','Papua New Guinea'].map(g=>(GEO[g]||[]).map(a=>`<path class="ad-map-neighbor" d="${poly(a)}"/>`).join('')).join('');
  let markers=DB.stations.map(s=>{const [x,y]=project(s.longitude,s.latitude),r=groupsById.get(s.id),selected=s.id===$('filterStation').value;if(!r)return `<circle class="ad-map-marker excluded" cx="${x}" cy="${y}" r="4"><title>${safe(s.name)} — tidak memenuhi kriteria clustering</title></circle>`;return `<circle class="ad-map-marker ${selected?'selected':''}" data-station="${safe(r.id)}" cx="${x}" cy="${y}" r="${selected?7.3:5.3}" fill="${color(r['k'+k])}" opacity="${focus===r['k'+k]?1:.58}" tabindex="0" role="button" aria-label="Pilih ${safe(r.name)}, klaster ${r['k'+k]}"><title>${safe(r.name)} — K${r['k'+k]} · PM2.5 ${num(r.annual)} µg/m³${r.code===r['medoid'+k]?' · MEDOID':''}</title></circle>`}).join('');
  root.innerHTML=`<svg viewBox="0 0 900 325" role="img" aria-label="Peta 20 stasiun yang dikelompokkan menggunakan K-Medoids WDTW tahun 2025">${grid}${neighbor}${land}${markers}</svg>`;
  root.querySelectorAll('[data-station]').forEach(el=>{el.addEventListener('click',()=>changeStation(el.dataset.station));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();changeStation(el.dataset.station)}})});
  const s=station(),g=groups().find(x=>x.id===focus);$('adMapInfo').innerHTML=s?`<strong>${safe(s.name)}</strong> · K${s['k'+k]} · ${num(s.annual)} µg/m³ · ${safe(s.site)}`:`<strong>${safe(g?.medoidName||'—')}</strong> · medoid K${focus} · stasiun terpilih tidak termasuk 20 kandidat`;
 }
 function members(){let gs=groups();$('adMemberCount').textContent=`${gs.length} KELOMPOK`;
  $('adMemberGrid').classList.toggle('k3',k===3);
  $('adMemberGrid').innerHTML=gs.map(g=>{let mem=rows.filter(r=>r['k'+k]===g.id),n=mem.map(r=>r.name).join(', ');return `<button type="button" data-cluster="${g.id}" class="ad-cluster-card ${g.id===focus?'active':''}" aria-label="Lihat klaster ${g.id} berisi ${g.n} stasiun"><div class="ad-cluster-top"><span><i class="ad-color" style="background:${color(g.id)}"></i> K${g.id}</span><span>${g.n} stasiun</span></div><span class="ad-cluster-medoid">◎ Medoid: ${safe(g.medoidName)}</span><span class="ad-cluster-members">${safe(n)}</span></button>`}).join('');
  $('adMemberGrid').querySelectorAll('button').forEach(el=>el.addEventListener('click',()=>setCluster(+el.dataset.cluster)));
 }
 function original(){
  const gs=groups(),max=Math.max(...gs.map(c=>c.meanAnnual)),g=gs.find(c=>c.id===focus),root=$('adAnnualBars');
  root.classList.toggle('is-k3',k===3);
  root.innerHTML=gs.map(c=>`<button type="button" data-cluster="${c.id}" class="ad-bar-row ${focus===c.id?'active':''}" title="K${c.id}: ${num(c.meanAnnual)} µg/m³ · ${c.n} stasiun. Klik untuk detail klaster."><span class="ad-bar-name" style="color:${color(c.id)}">K${c.id} <small>(${c.n})</small></span><strong>${num(c.meanAnnual)} <small>µg/m³</small></strong><span class="ad-bar-bg"><span class="ad-bar-inner" style="display:block;background:${color(c.id)};width:${Math.max(2,c.meanAnnual/max*100).toFixed(1)}%"></span></span></button>`).join('');
  root.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>setCluster(+b.dataset.cluster)));
  const desc=k===6?({1:'Kenaikan bertahap pada paruh kedua tahun',2:'Peningkatan terutama September–Oktober',3:'Tiga lokasi Jakarta, menguat Juli–Oktober',4:'Lonjakan pada September–Oktober',5:'Singleton: variasi absolut sangat kecil',6:'Singleton: variasi absolut sangat kecil'}[focus]):({1:'Dua lokasi dengan pola relatif datar',2:'Peningkatan menonjol pada paruh kedua tahun',3:'Kenaikan bertahap menuju Agustus–September'}[focus]);
  $('adSelectedInfo').innerHTML=`<b>K${focus} · ${safe(g?.medoidName||'—')} (medoid)</b><span>${safe(desc||'')}${g?.n===1?' · silhouette singleton = 0':''}.</span>`;
 }
 function validation(){const gs=groups(),selected=station();$('adSilhouette').textContent=num(D.meta[String(k)].silhouette,4);$('adSingletons').textContent=String(gs.filter(g=>g.n===1).length);$('adActiveCluster').textContent=`K${focus}`;
  const metricRows=[2,3,4,5,6].map(v=>`<div class="ad-validation-score ${v===k?'selected':''}"><span>K=${v}</span><div class="ad-score-bg"><div class="ad-score-fg" style="width:${(D.scores[String(v)]/.75*100).toFixed(1)}%"></div></div><span style="text-align:right">${num(D.scores[String(v)],3)}</span></div>`).join('');
  $('adValidation').innerHTML=`<div class="ad-validation-label">Silhouette WDTW <span>K = 2–6</span></div><div class="ad-validation-scores">${metricRows}</div><div class="ad-checks"><div><b>${num(D.meta[String(k)].ariWeekly,3)}</b><span>ARI · Mingguan 2025</span></div><div><b>${num(D.meta[String(k)].ari2024,3)}</b><span>ARI · Bulanan 2024</span></div></div>`;
  $('adMode6').classList.toggle('active',k===6);$('adMode3').classList.toggle('active',k===3);$('adMode6').setAttribute('aria-pressed',k===6?'true':'false');$('adMode3').setAttribute('aria-pressed',k===3?'true':'false');
 }
 function render(){if(!$('adShapeChart'))return;const s=station();if(!manualFocus&&s)focus=s['k'+k]; if(!groups().some(g=>g.id===focus))focus=groups()[0].id;
   chart();map();members();original();validation();
 }
 function switchK(kk){k=kk;manualFocus=false;render();}
 $('adMode6')?.addEventListener('click',()=>switchK(6)); $('adMode3')?.addEventListener('click',()=>switchK(3));
 $('adViewAll')?.addEventListener('click',()=>{viewMode='all';render()});
 $('adViewDetail')?.addEventListener('click',()=>{viewMode='detail';render()});
 $('adClusterPicker')?.addEventListener('change',e=>setCluster(+e.target.value));
 $('filterStation')?.addEventListener('change',()=>{manualFocus=false;});
 window.JEJAK_ADVANCED={render,getK:()=>k};
})();
