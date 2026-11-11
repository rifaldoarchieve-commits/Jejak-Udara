/* Jejak Udara V5 — stand-alone, data-driven, no external JS libraries. */
'use strict';
(()=>{
const DB=window.JEJAK_DATA;
const Q=window.JEJAK_QUALITY;
const CASE=window.JEJAK_CASE;
const V8=window.JEJAK_V8;
let caseRankMode="station",caseOutcome="resp",caseLag=0,epMode="pp22",healthStationOverride=null;
let qualityMode='all';
let healthBeforeParam=null;
const $=id=>document.getElementById(id);
if(!DB){document.body.innerHTML='<p>File data/data.js tidak ditemukan. Buka file dari folder proyek yang lengkap.</p>';return}
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(n,dp=1)=>Number.isFinite(n)?Number(n).toLocaleString('id-ID',{minimumFractionDigits:dp,maximumFractionDigits:dp}):'—';
const integer=n=>Number.isFinite(n)?Number(n).toLocaleString('id-ID',{maximumFractionDigits:0}):'—';
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const med=a=>{if(!a.length)return NaN;let s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const pctl=(a,p)=>{if(!a.length)return NaN;let s=[...a].sort((x,y)=>x-y),q=(s.length-1)*p,l=Math.floor(q),h=Math.ceil(q);return s[l]+(s[h]-s[l])*(q-l)};
const months=['JAN','FEB','MAR','APR','MEI','JUN','JUL','AGU','SEP','OKT','NOV','DES'];
const paramIndex={pm25:0,pm10:1,no2:2,so2:3,o3:4,co:5};
const labels={pm25:'PM2.5',pm10:'PM10',no2:'NO₂',so2:'SO₂',o3:'O₃',co:'CO'};
const available=DB.stations.filter(s=>s.included);
const station=id=>DB.stations.find(s=>s.id===id);
const initialStation=available.find(s=>s.name==='Gambir')?.id||available[0].id;
const state={year:'2025',param:'pm25',station:initialStation,page:'overview',hospital:DB.hospitals[0]?.id};
const countFor=(r,p)=>paramIndex[p]===0?r[7]:r[8+paramIndex[p]];
const daysIn=y=>y==='2026'?287:y==='2024'?366:365;
const allRows=(sid,y)=>(DB.daily[sid]||[]).filter(r=>r[0].startsWith(y));
const okRows=(sid,y,p)=>allRows(sid,y).filter(r=>Number.isFinite(r[1+paramIndex[p]])&&countFor(r,p)>=18);
const getVals=(sid,y,p)=>okRows(sid,y,p).map(r=>r[1+paramIndex[p]]);
const avg=(sid,y,p)=>mean(getVals(sid,y,p));
const coverage=(sid,y,p)=>allRows(sid,y).reduce((s,r)=>s+countFor(r,p),0)/(daysIn(y)*24)*100;
const getMonths=(sid,y,p)=>{const a=Array.from({length:12},()=>[]),ix=1+paramIndex[p];okRows(sid,y,p).forEach(r=>a[Number(r[0].slice(5,7))-1].push(r[ix]));return a.map(x=>({avg:mean(x),n:x.length}));};
const eligibleStations=(y,p,min=15)=>available.map(s=>({s,val:avg(s.id,y,p),n:okRows(s.id,y,p).length})).filter(x=>Number.isFinite(x.val)&&x.n>=min).sort((a,b)=>b.val-a.val);
const tip=$('floatingTip');
function tooltip(text,e){tip.textContent=text;tip.hidden=false;let x=e.clientX||130,y=e.clientY||150;tip.style.left=Math.min(window.innerWidth-278,Math.max(8,x+12))+'px';tip.style.top=Math.max(8,y-49)+'px'}
function attachTips(el){el.querySelectorAll('[data-tip]').forEach(node=>{node.addEventListener('pointerenter',e=>tooltip(node.dataset.tip,e));node.addEventListener('pointermove',e=>tooltip(node.dataset.tip,e));node.addEventListener('pointerleave',()=>tip.hidden=true);node.addEventListener('focus',()=>{const r=node.getBoundingClientRect();tooltip(node.dataset.tip,{clientX:r.x,clientY:r.y})});node.addEventListener('blur',()=>tip.hidden=true)})}
function updateNotice(){const s=station(state.station),count=okRows(s.id,state.year,state.param).length,cov=coverage(s.id,state.year,state.param),msgs=[];if(count<120)msgs.push(`Hanya ${count} hari layak analisis (ambang perbandingan: 120 hari) di ${s.name} (${state.year}).`);if(cov<75)msgs.push(`Cakupan jam VALID ${labels[state.param]} ${num(cov,1)}% — interpretasi harus hati-hati.`);if(state.year==='2026')msgs.push('2026 hanya sampai 14 Oktober (bukan satu tahun penuh).');const el=$('globalNotice');el.hidden=!msgs.length;el.textContent=msgs.join('  •  ')}
function initControls(){let sorted=[...available].sort((a,b)=>a.name.localeCompare(b.name,'id'));$('filterStation').innerHTML=sorted.map(s=>`<option value="${safe(s.id)}">${safe(s.name)}</option>`).join('');$('filterStation').value=state.station;for(const [id,key] of [['filterYear','year'],['filterParam','param'],['filterStation','station']]){$(id).addEventListener('change',e=>{state[key]=e.target.value;if(key==='station')healthStationOverride=null;renderAll()})}$('resetFilters').addEventListener('click',()=>{state.year='2025';state.param='pm25';state.station=initialStation;healthStationOverride=null;syncFilters();renderAll()});$('hospitalSelect').innerHTML=DB.hospitals.map(h=>{const m=CASE?.meta.find(z=>z.hospital===h.id),incomparable=!m?.unitsOk;return `<option value="${safe(h.id)}">${safe(h.name)}${incomparable?' · PM2.5 tidak sebanding':''}</option>`}).join('');$('hospitalSelect').value=state.hospital;$('hospitalSelect').addEventListener('change',e=>{state.hospital=e.target.value;const paired=CASE?.meta.find(m=>m.hospital===state.hospital);if(paired?.unitsOk){state.station=paired.sensor;healthStationOverride=null;syncFilters();renderAll()}else if(paired){healthStationOverride=paired.sensor;renderHealth()}});
$('caseOutcome').addEventListener('change',e=>{caseOutcome=e.target.value;renderHealth()});
$('caseLag').addEventListener('change',e=>{caseLag=Number(e.target.value);renderHealth()});
$('epBenchmark').addEventListener('change',e=>{epMode=e.target.value;renderEpisodes()});
$('caseRankStations').addEventListener('click',()=>{caseRankMode='station';renderExplore();renderSpatialCase()});
$('caseRankIslands').addEventListener('click',()=>{caseRankMode='island';renderExplore();renderSpatialCase()});$('openMapExplorer').addEventListener('click',()=>showPage('explore'));$('toggleMapInset').addEventListener('click',()=>{const el=$('mapInset'),next=el.hidden;el.hidden=!next;$('toggleMapInset').setAttribute('aria-expanded',String(next));$('toggleMapInset').textContent=next?'TUTUP ZOOM':'ZOOM JAWA'});$('watchMore').addEventListener('click',()=>showPage('explore'));
$('qaModeAll').addEventListener('click',()=>{qualityMode='all';renderQuality()});
$('qaModeFiltered').addEventListener('click',()=>{qualityMode='filtered';renderQuality()});document.querySelectorAll('.navtab').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));window.addEventListener('hashchange',()=>{let id=location.hash.slice(1);if(['overview','explore','episodes','health','quality','advanced'].includes(id))showPage(id,false)});const hash=location.hash.slice(1);if(['overview','explore','episodes','health','quality','advanced'].includes(hash))showPage(hash,false)}
function syncFilters(){$('filterYear').value=state.page==='advanced'?'2025':state.year;$('filterParam').value=(state.page==='health'||state.page==='advanced')?'pm25':state.param;$('filterStation').value=state.station}
function showPage(p,updateHash=true){state.page=p;document.querySelectorAll('.navtab').forEach(b=>{let selected=b.dataset.page===p;b.classList.toggle('active',selected);b.setAttribute('aria-current',selected?'page':'false')});document.querySelectorAll('.dashboard-page').forEach(x=>x.classList.toggle('active',x.id==='page-'+p));const defs={overview:['CONTROL CENTER / 01','Air Quality Overview','Dataset sintetis · 27 stasiun AQMS · 2024–14 Okt 2026'],explore:['SPATIAL & DRIVERS / 02','Patterns & Drivers','Polutan, meteorologi, karakteristik lokasi, dan perbandingan pulau'],episodes:['EPISODE ANALYSIS / 03','Pollution Episodes','Frekuensi dan durasi konsentrasi tinggi: PP 22/2021 atau P95 historis'],health:['HEALTH SIGNALS / 04','Air Quality & Health','27 pasangan AQMS–rumah sakit sesuai booklet · asosiasi & lag'],quality:['QC & NETWORK / 05','Data & Network Quality','QC pengukuran, kelengkapan, dan keterwakilan 27 titik AQMS'],advanced:['ADVANCED ANALYTICS / 06','Station Pattern Clustering','K-Medoids + WDTW · PM2.5 bulanan 2025 · kemiripan bentuk pola']};$('pageKicker').textContent=defs[p][0];$('pageHeading').textContent=defs[p][1];$('pageSubhead').textContent=defs[p][2];const pollutionControl=$('filterParam');if(p==='health'||p==='advanced'){pollutionControl.value='pm25';pollutionControl.parentElement.querySelector('span').textContent=(p==='advanced'?'POLUTAN · WDTW':'POLUTAN · HEALTH');pollutionControl.disabled=true;pollutionControl.title='Analisis tab ini khusus PM2.5; filter polutan tidak berlaku.';pollutionControl.parentElement.classList.add('v8-control-locked')}else{pollutionControl.value=state.param;pollutionControl.parentElement.querySelector('span').textContent='POLUTAN';pollutionControl.disabled=false;pollutionControl.title='';pollutionControl.parentElement.classList.remove('v8-control-locked')}const yearControl=$('filterYear');if(p==='advanced'){yearControl.value='2025';yearControl.disabled=true;yearControl.title='Clustering memakai Januari–Desember 2025 secara tetap';yearControl.parentElement.classList.add('v8-control-locked')}else{yearControl.value=state.year;yearControl.disabled=false;yearControl.title='';yearControl.parentElement.classList.remove('v8-control-locked')}if(updateHash)history.replaceState(null,'','#'+p);window.scrollTo({top:0,behavior:'instant'});if(p==='health')renderHealth();if(p==='quality')renderQuality();if(p==='explore')renderSpatialCase();if(p==='advanced'){ $('globalNotice').hidden=true;window.JEJAK_ADVANCED?.render()}else{updateNotice()}}
function selectStation(id){const s=station(id);if(!s.included){const el=$('globalNotice');el.hidden=false;el.textContent=`${s.name} menggunakan label satuan ppm pada ekspor; tidak ikut dalam perbandingan konsentrasi µg/m³.`;return}state.station=id;healthStationOverride=null;syncFilters();renderAll()}
function mapSvg(){
const svg=$('overviewMap'),inset=$('westernInset'),geometry=window.JEJAK_GEOMETRY||{};
const proj=(lon,lat)=>[72+(lon-94)*16,291-(lat+11)*16];
const polygonPath=(pts,project)=>pts.map((pt,i)=>{const [x,y]=project(pt[0],pt[1]);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`}).join(' ')+' Z';
const allPaths=(name,cls,project)=> (geometry[name]||[]).map(r=>`<path class="${cls}" d="${polygonPath(r,project)}"/>`).join('');
const neighbors=['Malaysia','Brunei','Timor-Leste','Papua New Guinea','Philippines'].map(name=>allPaths(name,'map-neighbor',proj)).join('');
let grid='';for(let lon=95;lon<=140;lon+=5){const [xx]=proj(lon,0);grid+=`<path class="mapgrid" d="M${xx} 13 V312"/>`};for(let lat=-10;lat<=5;lat+=5){const [,yy]=proj(0,lat);grid+=`<path class="mapgrid" d="M27 ${yy} H880"/>`}
const labelsGeo=[[99.9,0,'SUMATRA'],[110.0,-9.1,'JAWA'],[113.0,3.6,'KALIMANTAN'],[123.4,4.3,'SULAWESI'],[138.4,1.1,'PAPUA'],[122.4,-9.5,'NUSA TENGGARA']].map(([lon,lat,name])=>{const [xx,yy]=proj(lon,lat);return `<text class="maplabel" x="${xx}" y="${yy}" text-anchor="middle">${name}</text>`}).join('');
const points=DB.stations.map(s=>{const [xx,yy]=proj(s.longitude,s.latitude),sel=s.id===state.station;return `<circle class="mapdot ${sel?'selected':''} ${s.included?'':'excluded'}" data-id="${safe(s.id)}" cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${sel?7.5:5}" tabindex="0" role="button" aria-label="Stasiun ${safe(s.name)}"/>`}).join('');
const defs=`<defs><filter id="stationGlow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="3" result="soft"/><feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge></filter><linearGradient id="seaWash" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#112830"/><stop offset=".6" stop-color="#10232a"/><stop offset="1" stop-color="#10202a"/></linearGradient></defs>`;
svg.innerHTML=defs+`<rect width="900" height="325" fill="url(#seaWash)"/>${grid}<g aria-hidden="true">${neighbors}</g><g class="map-countries" aria-hidden="true">${allPaths('Indonesia','map-land',proj)}</g>${labelsGeo}<g>${points}</g>`;
function stationEvents(root){root.querySelectorAll('.mapdot').forEach(el=>{const s=station(el.dataset.id),val=avg(s.id,state.year,state.param),label=`${s.name} · ${s.region} · ${s.included?num(val,1)+' µg/m³':'Unit ppm — perlu verifikasi'}`;el.addEventListener('pointerenter',e=>{tooltip(label,e);$('mapInfo').innerHTML=`<b>${safe(s.name)}</b> · ${safe(s.site)}<br>${s.included?`${labels[state.param]}: ${num(val,1)} µg/m³ · ${state.year}`:'Satuan belum dapat disamakan'}`});el.addEventListener('pointermove',e=>tooltip(label,e));el.addEventListener('pointerleave',()=>tip.hidden=true);el.addEventListener('click',()=>selectStation(s.id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectStation(s.id)}})})}
stationEvents(svg);
// Inset of Java and southern Sumatra: genuinely larger scale than main projection.
const box={x0:103.9,x1:117.2,y0:-9.6,y1:-4.85};const iw=285,ih=133,pad={top:24,bottom:6,left:8,right:8};const sc=Math.min((iw-pad.left-pad.right)/(box.x1-box.x0),(ih-pad.top-pad.bottom)/(box.y1-box.y0));const cx=(iw-sc*(box.x1-box.x0))/2,cy=pad.top+(ih-pad.top-pad.bottom-sc*(box.y1-box.y0))/2;
const projInset=(lon,lat)=>[cx+sc*(lon-box.x0),cy+sc*(box.y1-lat)];
const insetPaths=allPaths('Indonesia','map-land',projInset);
const insetPoints=DB.stations.filter(s=>s.longitude>=box.x0&&s.longitude<=box.x1&&s.latitude>=box.y0&&s.latitude<=box.y1).map(s=>{const [xx,yy]=projInset(s.longitude,s.latitude),sel=s.id===state.station;return `<circle class="mapdot inset-dot ${sel?'selected':''} ${s.included?'':'excluded'}" data-id="${safe(s.id)}" cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${sel?5.4:3.9}" tabindex="0" role="button" aria-label="Stasiun ${safe(s.name)}"/>`}).join('');
inset.innerHTML=`<defs><clipPath id="clipInset"><rect x="0" y="0" width="285" height="133" rx="6"/></clipPath></defs><g clip-path="url(#clipInset)">${insetPaths}${insetPoints}</g>`;
stationEvents(inset);
const s=station(state.station);$('mapInfo').innerHTML=`<b>${safe(s.name)} / ${safe(s.region)}</b><br>${safe(s.site)} · klik titik untuk memilih stasiun`;
}
function miniLine(id,vals,color='#C7F36B'){const el=$(id),w=340,h=80,pad={l:7,r:7,t:10,b:12},good=vals.filter(Number.isFinite);if(!good.length){el.innerHTML='<div class="muted">Tidak ada data yang memenuhi kriteria.</div>';return}const max=Math.max(...good)*1.1||1,min=Math.min(0,...good),X=i=>pad.l+i*(w-pad.l-pad.r)/11,Y=v=>pad.t+(h-pad.t-pad.b)*(max-v)/(max-min||1);let shapes=`<path d="M0 61 H340 M0 35 H340" stroke="#41514d" stroke-dasharray="3 5" fill="none" opacity=".7"/>`;let started=false,cmd='';vals.forEach((v,i)=>{if(!Number.isFinite(v)){started=false;return}cmd+=(started?'L':'M')+X(i)+' '+Y(v)+' ';started=true});shapes+=`<path d="${cmd}" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;vals.forEach((v,i)=>{if(Number.isFinite(v))shapes+=`<circle cx="${X(i)}" cy="${Y(v)}" r="3" fill="${color}" data-tip="${months[i]}: ${num(v,2)} µg/m³"/>`});el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik tren bulanan">${shapes}</svg>`;attachTips(el)}
function lineChart(id,series,tipUnit='µg/m³'){const el=$(id),w=920,h=290,p={l:55,r:24,t:18,b:32},v=series.flatMap(s=>s.vals).filter(Number.isFinite);if(!v.length){el.innerHTML='<p class="muted">Tidak ada data sesuai kriteria.</p>';return}const max=Math.max(...v)*1.14||1,X=i=>p.l+i*(w-p.l-p.r)/11,Y=y=>p.t+(h-p.t-p.b)*(1-y/max);let html='';for(let i=0;i<5;i++){let n=max*i/4,y=Y(n);html+=`<line class="chart-grid" x1="${p.l}" x2="${w-p.r}" y1="${y}" y2="${y}"/><text class="axis-label" x="${p.l-9}" y="${y+4}" text-anchor="end">${integer(n)}</text>`}months.forEach((m,i)=>html+=`<text class="axis-label" x="${X(i)}" y="${h-8}" text-anchor="middle">${m}</text>`);for(const s of series){let path='',inLine=false;s.vals.forEach((value,i)=>{if(!Number.isFinite(value)){inLine=false;return}path+=(inLine?'L':'M')+X(i).toFixed(2)+' '+Y(value).toFixed(2)+' ';inLine=true});html+=`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;s.vals.forEach((val,i)=>{if(Number.isFinite(val)){html+=`<circle cx="${X(i)}" cy="${Y(val)}" r="4" fill="${s.color}" stroke="#112126" stroke-width="2"/><circle class="chart-hit" data-tip="${safe(s.name)} · ${months[i]}: ${num(val,2)} ${safe(tipUnit)}" cx="${X(i)}" cy="${Y(val)}" r="13" opacity="0" tabindex="0"/>`}})}el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Grafik tren bulanan interaktif">${html}</svg>`;attachTips(el)}
function renderOverview(){const s=station(state.station),y=state.year,p=state.param,m=getMonths(s.id,y,p),vals=getVals(s.id,y,p),rank=eligibleStations(y,p,120),av=mean(vals),c=coverage(s.id,y,p),n=vals.length;
mapSvg();$('monitorStationChip').textContent=s.name.toUpperCase();$('monitorCaption').textContent=`${labels[p]} · RERATA HARIAN LAYAK ${y}`;$('snapshotValue').textContent=num(av,1);$('snapshotDays').textContent=`${n}/${daysIn(y)}`;$('snapshotCoverage').textContent=num(c,1)+'%';$('snapshotStatus').textContent=c>=90?'Cakupan jam valid tinggi':c>=75?'Cakupan jam valid cukup':'Cakupan jam valid rendah; hati-hati';$('monitorStationChip').title=s.region;
for(const [id,param] of [['envPM25','pm25'],['envPM10','pm10'],['envNO2','no2'],['envO3','o3']])$(id).textContent=num(avg(s.id,y,param),1);$('envYear').textContent=y;
miniLine('overviewSpark',m.map(x=>x.avg));const viable=m.map((v,i)=>({m:months[i],val:v.avg,n:v.n})).filter(o=>Number.isFinite(o.val)),peak=[...viable].sort((a,b)=>b.val-a.val)[0];$('pulseDelta').textContent=peak?`PEAK ${peak.m}`:'NO DATA';$('sparkNote').textContent=`${labels[p]} · Puncak ${peak?peak.m+' '+num(peak.val,1)+' µg/m³':'tidak tersedia'} · ${y}`;
const siteType=s.site;const stRank=rank.findIndex(x=>x.s.id===s.id)+1;$('insightText').textContent=n<120?`Hanya ${n} hari layak analisis di ${s.name}. Hindari interpretasi tren dan peringkat yang terlalu kuat.`: `${s.name} (${siteType}) mencatat rerata ${labels[p]} ${num(av,1)} µg/m³ pada ${y}. ${stRank?`Peringkat ${stRank} dari ${rank.length} stasiun dengan cakupan memadai.`:'Tidak masuk kelompok peringkat karena cakupan.'} ${peak?'Puncak rerata bulanan: '+peak.m+'.':''}`;
renderOverviewHeat(rank.slice(0,6));renderWatchlist(rank.slice(0,5));$('heatParam').textContent=labels[p];
}
function renderOverviewHeat(rank){const y=state.year,p=state.param,rows=rank.map(z=>({name:z.s.name,sid:z.s.id,mo:getMonths(z.s.id,y,p)})),all=rows.flatMap(z=>z.mo.map(m=>m.avg)).filter(Number.isFinite),min=Math.min(...all),max=Math.max(...all),span=max-min||1;let html='<div></div>'+months.map(m=>`<div class="heat-label">${m}</div>`).join('');for(const r of rows){html+=`<div class="heat-row-name" title="${safe(r.name)}">${safe(r.name)}</div>`;r.mo.forEach((m,i)=>{let good=Number.isFinite(m.avg),t=good?(m.avg-min)/span:0,bg=good?`rgba(${Math.round(24+144*t)},${Math.round(57+151*t)},${Math.round(52+46*t)},${(0.42+.50*t).toFixed(2)})`:'#2b353a';html+=`<div class="heat-cell" style="background:${bg};color:${good&&t>.80?'#16241B':'#eefaf3'}" data-tip="${safe(r.name)} · ${months[i]}: ${good?num(m.avg,1)+' µg/m³ · '+m.n+' hari':'Tidak ada data layak'}" tabindex="0">${good?integer(m.avg):'—'}</div>`})}$('overviewHeat').innerHTML=html;attachTips($('overviewHeat'))}
function renderWatchlist(rows){const max=rows.length?rows[0].val:1;$('watchlist').innerHTML=rows.map((r,i)=>`<div class="watch-row" data-station="${safe(r.s.id)}" role="button" tabindex="0" title="Pilih ${safe(r.s.name)}"><span class="watch-rank">${String(i+1).padStart(2,'0')}</span><span class="watch-name">${safe(r.s.name)}</span><span class="watch-bar"><span style="width:${Math.max(0,r.val/max*100)}%"></span></span><span class="watch-value">${num(r.val,1)}</span></div>`).join('')||'<span class="muted">Data tidak cukup.</span>';$('watchlist').querySelectorAll('[data-station]').forEach(row=>{row.addEventListener('click',()=>selectStation(row.dataset.station));row.addEventListener('keydown',e=>{if(e.key==='Enter')selectStation(row.dataset.station)})})}
function renderExplore(){const s=station(state.station),y=state.year,p=state.param,m=getMonths(s.id,y,p),rank=eligibleStations(y,p,120);$('expUnit').textContent=labels[p]+' · µg/m³';lineChart('monthlyChart',[{name:labels[p]+' · '+s.name,color:'#C7F36B',vals:m.map(q=>q.avg)}]);const max=rank.length?rank[0].val:1;$('fullRanking').innerHTML=rank.slice(0,10).map((z,i)=>`<div class="rank-line" data-station="${safe(z.s.id)}" role="button" tabindex="0"><span class="rank-no">${String(i+1).padStart(2,'0')}</span><span class="rank-label">${safe(z.s.name)}</span><span class="rank-track"><i class="rank-fill" style="width:${z.val/max*100}%"></i></span><span class="rank-num">${num(z.val,1)}</span></div>`).join('')||'Tidak ada peringkat';$('fullRanking').querySelectorAll('[data-station]').forEach(z=>{z.addEventListener('click',()=>selectStation(z.dataset.station));z.addEventListener('keydown',e=>{if(e.key==='Enter')selectStation(z.dataset.station)})});const good=m.map(x=>x.avg).filter(Number.isFinite),lo=Math.min(...good),hi=Math.max(...good),span=hi-lo||1;$('stationMonths').innerHTML=m.map((z,i)=>{let t=Number.isFinite(z.avg)?(z.avg-lo)/span:0;let bg=Number.isFinite(z.avg)?`rgba(${Math.round(37+114*t)},${Math.round(75+123*t)},${Math.round(58+42*t)},${(.25+.59*t).toFixed(2)})`:'#263035';return `<div class="month-square" style="background:${bg}" title="${months[i]} · ${z.n} hari layak"><small>${months[i]}</small><b>${Number.isFinite(z.avg)?num(z.avg,1):'—'}</b></div>`}).join('');let a=[['LOKASI',s.name],['PROVINSI',s.region],['KARAKTERISTIK',s.site],['STATUS SENSOR',s.status],['KOORDINAT',s.latitude+', '+s.longitude],['CAKUPAN VALID',num(coverage(s.id,y,p),1)+'%']];$('stationProfile').innerHTML=a.map(([k,v])=>`<div class="profile-item"><small>${safe(k)}</small><strong>${safe(v)}</strong></div>`).join('')}
function epData(){const sid=state.station,y=state.year,p=state.param,base=getVals(sid,'2024',p),limitPP={pm25:55,pm10:75},limitWHO={pm25:15,pm10:45};
 const effectiveMode=(p!=='pm25'&&p!=='pm10')?'p95':epMode;
 const thr=effectiveMode==='pp22'?limitPP[p]:effectiveMode==='who'?limitWHO[p]:(base.length>=30?pctl(base,.95):NaN);
 const current=okRows(sid,y,p),dayMap=new Map(current.map(r=>[r[0],r[1+paramIndex[p]]])),last=y==='2026'?'2026-10-14':y+'-12-31',start=new Date(y+'-01-01T00:00:00Z'),end=new Date(last+'T00:00:00Z'),out=[];
 let streak=0,longest=0,startStreak=null,best=null;
 for(let timestamp=start.getTime();timestamp<=end.getTime();timestamp+=86400000){const date=new Date(timestamp).toISOString().slice(0,10),val=dayMap.get(date),high=Number.isFinite(val)&&Number.isFinite(thr)&&val>thr;
 out.push({date,val,high});if(high){streak++;if(streak===1)startStreak=date}else{if(streak>longest){longest=streak;best=[startStreak,out[out.length-2]?.date]}streak=0}}
 if(streak>longest){longest=streak;best=[startStreak,out[out.length-1]?.date]}
 return {thr,out,high:out.filter(z=>z.high).length,longest,best,peak:current.length?Math.max(...current.map(z=>z[1+paramIndex[p]])):NaN,n:base.length,p,mode:effectiveMode,validDays:current.length}
}
function renderEpisodes(){
 const d=epData(),y=state.year,s=station(state.station),p=d.p,pp=p==='pm25'?55:75,who=p==='pm25'?15:45;
 // For gas parameters, disable regulatory choices and explicitly use a relative statistical threshold.
 const benchmark=$('epBenchmark');for(const opt of benchmark.options){opt.disabled=(p!=='pm25'&&p!=='pm10'&&opt.value!=='p95')};benchmark.value=d.mode;
 $('epThreshold').textContent=num(d.thr,1);$('epDays').textContent=Number.isFinite(d.thr)?integer(d.high):'—';$('epStreak').textContent=Number.isFinite(d.thr)?integer(d.longest):'—';$('epPeak').textContent=num(d.peak,1);$('epLabel').textContent=`${labels[p]} · ${y}`;
 $('epThresholdTitle').textContent=`${labels[p]} · ${d.mode==='p95'?'P95 2024':d.mode==='pp22'?'PP22 24 JAM':'WHO 24 JAM'}`;
 $('caseEpisodeLegend').textContent=`${labels[p]} · > ${num(d.thr,1)} µg/m³`;
 $('epMethod').textContent=d.mode==='p95'?`P95 dihitung dari ${d.n} hari layak ${labels[p]} tahun 2024. Ini ambang relatif, bukan baku mutu.`:d.mode==='pp22'?`Pembanding PP 22/2021 ${labels[p]} 24 jam: ${pp} µg/m³. Jumlah hari > ambang bersifat indikatif (≥18 jam/hari), bukan evaluasi hukum formal.`:`Pembanding WHO 2021 ${labels[p]} 24 jam: ${who} µg/m³. Panduan WHO memakai evaluasi persentil ke-99; jumlah hari > ambang bukan penilaian formal.`;
 $('epInsight').innerHTML=Number.isFinite(d.thr)?`<b>${safe(s.name)} · ${labels[p]} · ${y}</b><p><strong>${integer(d.high)} dari ${d.validDays} hari layak</strong> melewati ambang ${num(d.thr,1)} µg/m³. ${d.longest?`Rentetan terpanjang ${d.longest} hari (${safe(d.best?.[0])} s.d. ${safe(d.best?.[1])}).`:''}</p>`:'<p>Data layak 2024 tidak cukup untuk menghitung P95 historis.</p>';
 $('epNoteMetrics').innerHTML=`<div><span>HARI LAYAK DIANALISIS</span><strong>${integer(d.validDays)}<small> / ${integer(d.out.length)} hari</small></strong></div><div><span>PROPORSI HARI &gt; AMBANG</span><strong>${Number.isFinite(d.thr)&&d.validDays>0?num(100*d.high/d.validDays,1)+'%':'—'}</strong></div>`;
 // V9.5: a compact visual breakdown fills unused KPI-panel space with useful, filter-aware context.
 // With no valid benchmark, display eligible/insufficient coverage but do not call days 'below'.
 const totalDays=d.out.length,missingDays=Math.max(0,totalDays-d.validDays),thresholdOk=Number.isFinite(d.thr);
 const belowDays=thresholdOk?Math.max(0,d.validDays-d.high):0;
 const highDays=thresholdOk?d.high:0;
 const unclassifiedDays=thresholdOk?missingDays:totalDays;
 const pct=(count)=>totalDays>0?(100*count/totalDays):0;
 $('epMixBelow').style.width=pct(belowDays).toFixed(5)+'%';
 $('epMixAbove').style.width=pct(highDays).toFixed(5)+'%';
 $('epMixMissing').style.width=pct(unclassifiedDays).toFixed(5)+'%';
 $('epMixBelowLabel').textContent=thresholdOk?integer(belowDays):'—';
 $('epMixAboveLabel').textContent=thresholdOk?integer(highDays):'—';
 $('epMixMissingLabel').textContent=integer(unclassifiedDays);
 $('epMixCaption').textContent=thresholdOk?`${integer(d.validDays)} / ${integer(totalDays)} hari layak`:`Ambang tidak tersedia`;
 $('epDayMix').setAttribute('aria-label',thresholdOk?`${belowDays} hari pada atau di bawah ambang, ${highDays} hari di atas ambang, ${missingDays} hari kurang data`:`${totalDays} hari belum dapat diklasifikasi karena ambang tidak tersedia`);

 const W=1050,H=285,left=15,right=12,top=8,bottom=30,cw=(W-left-right)/d.out.length,maxV=Math.max(1,...d.out.map(x=>Number.isFinite(x.val)?x.val:0));let bars='';
 d.out.forEach((r,i)=>{const x=left+i*cw,w=Math.max(.8,cw-.55);if(!Number.isFinite(r.val)){bars+=`<rect x="${x}" y="${H-bottom-3}" width="${w}" height="3" fill="#44565a" data-tip="${r.date}: data tidak memadai"/>`;return}const hh=Math.max(1,r.val/maxV*(H-bottom-top)),yy=H-bottom-hh;bars+=`<rect data-tip="${safe(r.date)} · ${num(r.val,1)} µg/m³ ${labels[p]}${r.high?' · di atas pembanding':''}" x="${x.toFixed(2)}" y="${yy.toFixed(2)}" width="${w.toFixed(2)}" height="${hh.toFixed(2)}" fill="${r.high?'#eabb74':'#B5DD66'}"/>`});
 const ticks=months.map((m,i)=>`<text x="${left+(i+.5)*(W-left-right)/12}" y="${H-7}" text-anchor="middle" fill="#93ada6" font-size="12">${m}</text>`).join('');
 const scale=`<line x1="${left}" y1="${H-bottom}" x2="${W-right}" y2="${H-bottom}" stroke="#607d77"/><text x="${left+2}" y="${top+12}" fill="#afcfc3" font-size="11">0–${num(maxV,0)} µg/m³ · skala linear</text>`;
 $('episodeChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Timeline ${labels[p]} harian skala linear">${scale}${bars}${ticks}</svg>`;attachTips($('episodeChart'));
 $('episodeMonths').innerHTML=months.map((m,i)=>{const nr=d.out.filter(z=>Number(z.date.slice(5,7))===i+1&&z.high).length,good=d.out.filter(z=>Number(z.date.slice(5,7))===i+1&&Number.isFinite(z.val)).length;return `<div class="ep-month-row"><span>${m}</span><strong>${nr} / ${good} hari</strong></div>`}).join('')
}
function renderHealth(){renderHealthCase()}
function qaPercent(n,d){return d>0?100*n/d:NaN}
function qaMonthSlots(year,month){if(year==='2026'&&month>10)return 0;let d=new Date(Number(year),month,0).getDate();if(year==='2026'&&month===10)d=14;return d*24}
function qaBadge(v){return v>=90?'HIGH COVERAGE':v>=75?'MODERATE COVERAGE':'LOW COVERAGE'}
function qaCard(title,value,desc,icon){return `<div class="qa-kpi"><div class="qa-kpi-label"><span>${safe(title)}</span><span class="qa-kpi-symbol">${icon}</span></div><strong>${safe(value)}</strong><small>${safe(desc)}</small></div>`}
function qaColor(v){if(!Number.isFinite(v))return '#293538';if(v<25)return '#704d3d';if(v<50)return '#826543';if(v<75)return '#78845c';if(v<90)return '#91A84C';return '#C7F36B'}
function renderQuality(){if(!Q){$('qaScopeLabel').textContent='File quality.js belum tersedia.';return}
const overall=qualityMode==='all';
$('qaModeAll').classList.toggle('active',overall);$('qaModeFiltered').classList.toggle('active',!overall);
$('qaModeAll').setAttribute('aria-pressed',String(overall));$('qaModeFiltered').setAttribute('aria-pressed',String(!overall));
const selected=station(state.station),y=state.year,p=state.param,pi=paramIndex[p];
const records=overall?DB.stations.reduce((a,s)=>a+s.rawRows,0):Q.years[selected.id][y][0];
const valid=overall?DB.stations.reduce((a,s)=>a+s.validRows,0):Q.years[selected.id][y][1];
const stat=overall?null:Q.years[selected.id][y];
const status={};if(overall){for(const s of DB.stations)for(const [k,v] of Object.entries(s.qc))status[k]=(status[k]||0)+v}else Object.assign(status,stat[5]);
const pct=qaPercent(valid,records),expected=daysIn(y)*24,usable=overall?null:stat[3][pi],validQHours=overall?null:stat[2],usableRows=overall?null:stat[4][pi],cov=overall?null:qaPercent(usable,expected),days=overall?null:okRows(selected.id,y,p).length;
$('qaScopeLabel').textContent=overall?'All 27 AQMS stations · all source records':`${selected.name} · ${y} · ${labels[p]}`;
$('qaScopeHint').textContent=overall?'Audit seluruh catatan sumber; filter Tahun, Polutan dan Stasiun tidak berlaku pada mode ini.':`Mengikuti filter aktif • ${daysIn(y)} hari periode • QC per baris, ketersediaan ${labels[p]} per jam.`;
$('qaStatusChip').textContent=overall?'ALL HISTORICAL RECORDS':selected.name.toUpperCase()+' · '+y;
$('qcTotal').textContent=integer(records);$('qcValid').textContent=integer(valid);$('qcOther').textContent=integer(records-valid);$('qcPercent').textContent=num(pct,1)+'%';
$('qcDonut').style.background=`conic-gradient(#C7F36B 0% ${pct}%,#3d5154 ${pct}% 100%)`;
$('qaKpiRow').innerHTML=overall?[
qaCard('ALL SOURCE RECORDS',integer(records),'27 AQMS · seluruh file','▦'),
qaCard('QC VALID',num(pct,1)+'%','Persentase dari seluruh baris','◉'),
qaCard('OTHER QC FLAGS',integer(records-valid),'Status selain VALID','⚑'),
qaCard('REGISTERED STATIONS',integer(DB.stations.length),'24 µg/m³ · 3 ppm','⌖'),
qaCard('VALID HOURLY COVERAGE',num((()=>{let sum=0;for(const s of DB.stations)for(const z of Object.values(Q.years[s.id]))sum+=z[2];return sum/(DB.stations.length*24432)*100})(),1)+'%','Jam unik VALID · periode resmi','◷')
].join(''):[
qaCard('SOURCE RECORDS',integer(records),`${selected.name} · ${y}`,'▦'),
qaCard('QC VALID',num(pct,1)+'%','Status QC per baris','◉'),
qaCard(`${labels[p]} USABLE HOURS`,integer(usable),`${integer(expected)} slot jam diharapkan`,'◷'),
qaCard('HOURLY COVERAGE',num(cov,1)+'%','Jam unik dengan nilai valid','▥'),
qaCard('ELIGIBLE DAYS',`${integer(days)}/${integer(daysIn(y))}`,'≥18 jam valid per hari','✓')
].join('');
const allStatuses=Object.entries(status).sort((a,b)=>b[1]-a[1]);const maxN=Math.max(1,...allStatuses.map(s=>s[1]));
$('qcStatus').innerHTML=allStatuses.map(([k,v])=>`<div class="status-row"><span>${safe(k)}</span><div class="status-bar"><i style="width:${v/maxN*100}%"></i></div><strong>${integer(v)}</strong></div>`).join('');
const extra=$('qaStatusExtra');extra.hidden=overall||allStatuses.length>4;if(!extra.hidden){extra.innerHTML=`<strong>PARAMETER VALIDITY CHECK</strong><div><span>QC-valid rows</span><b>${integer(valid)}</b></div><div><span>${safe(labels[p])} valid rows</span><b>${integer(usableRows)}</b></div><div><span>QC-valid unique hours</span><b>${integer(validQHours)}</b></div><div><span>${safe(labels[p])} usable unique hours</span><b>${integer(usable)}</b></div>`;}

$('qaStatusFooter').textContent=overall?'Distribusi status QC dari seluruh baris data, termasuk catatan bermasalah di luar periode nominal.':`QC pada baris stasiun ${selected.name} tahun ${y}; perubahan polutan tidak mengubah status QC baris, tetapi mengubah validitas parameternya.`;
const cols=overall?['2024','2025','2026']:['QC VALID',labels[p]];
$('qaMonthHeading').textContent=overall?'Hourly Coverage · National AQMS':'Monthly Data Completeness';
$('qaMatrixChip').textContent=overall?'2024–2026':y+' · '+labels[p];
let cells='<div class="qa-matrix-corner"></div>'+months.map(m=>`<div class="qa-matrix-col">${m}</div>`).join('');let values=[];
cols.forEach((rowName,ix)=>{cells+=`<div class="qa-matrix-rowlabel">${safe(rowName)}</div>`;for(let month=1;month<=12;month++){
let y0=overall?rowName:y,expectedSlots=qaMonthSlots(y0,month),n=0,den=0;
if(overall){if(expectedSlots){for(const s of DB.stations){n+=Q.months[s.id][`${y0}-${String(month).padStart(2,'0')}`][2];den+=expectedSlots}}}else if(expectedSlots){let mm=Q.months[selected.id][`${y}-${String(month).padStart(2,'0')}`];n=ix===0?mm[2]:mm[3][pi];den=expectedSlots}
let v=den?100*n/den:NaN;values.push(v);const label=`${safe(rowName)} ${months[month-1]} · ${Number.isFinite(v)?num(v,1)+'% · '+integer(n)+'/'+integer(den)+' jam':'Di luar periode sumber'}`;
cells+=`<div class="qa-matrix-cell ${Number.isFinite(v)?'':'unavailable'}" style="background:${qaColor(v)};color:${v>=90?'#17251B':'#f0f9f4'}" data-tip="${label}" tabindex="0">${Number.isFinite(v)?integer(v):'—'}</div>`
}});$('qaMonthMatrix').innerHTML=cells;attachTips($('qaMonthMatrix'));
const computed=values.filter(Number.isFinite);$('qaMatrixSummary').textContent=overall?'Sel menunjukkan persentase jam unik berstatus QC VALID, dihitung untuk 27 stasiun pada bulan dan tahun tersebut.':`Baris atas: jam dengan QC VALID. Baris bawah: jam dengan nilai ${labels[p]} valid, terhingga, dan nonnegatif.`;
$('qaMatrixFooter').textContent=overall?'2026 hanya Jan–14 Okt. Persentase bulanan bukan persentase baris.':'Setiap sel dibandingkan dengan seluruh jam yang diharapkan pada bulan tersebut.';
$('qaBreakdownTitle').textContent=overall?'Stations Requiring Attention':'Parameter Availability · Selected Station';$('qaBreakdownChip').textContent=overall?'BOTTOM 8':'6 POLLUTANTS';$('qcStationList').classList.toggle('is-params',!overall);
if(overall){const sts=[...DB.stations].sort((a,b)=>a.validRows/a.rawRows-b.validRows/b.rawRows).slice(0,8);
$('qcStationList').innerHTML=sts.map(s=>{let q=qaPercent(s.validRows,s.rawRows);return `<div class="quality-station" title="${safe(s.name)}: ${integer(s.validRows)} / ${integer(s.rawRows)}"><span>${safe(s.name)}</span><div class="bar"><span style="width:${q}%"></span></div><strong>${num(q,1)}%</strong></div>`}).join('');$('qaBreakdownFooter').textContent='Proporsi baris VALID seluruh periode, bukan kinerja kualitas udara.';
}else{$('qcStationList').innerHTML=Q.params.map((q,i)=>{let n=stat[3][i],v=qaPercent(n,expected);return `<button type="button" class="quality-station qa-parameter ${q===p?'is-current':''}" data-qa-param="${q}" title="Pilih ${safe(labels[q])} untuk melihat rincian cakupan"><span>${safe(labels[q])}</span><div class="bar"><span style="width:${v}%"></span></div><strong>${num(v,1)}%</strong></button>`}).join('');$('qcStationList').querySelectorAll('[data-qa-param]').forEach(b=>b.addEventListener('click',()=>{state.param=b.dataset.qaParam;syncFilters();renderAll()}));$('qaBreakdownFooter').textContent=`Cakupan jam unik enam polutan di ${selected.name}, ${y}. Klik bar untuk mengubah pilihan polutan.`;}
const verdict=overall?{good:false,title:'Integrity overview · substantial station variation',detail:'Proporsi VALID gabungan cukup tinggi, tetapi Muaro Jambi dan Merauke memiliki cakupan catatan yang jauh lebih rendah. Audit per stasiun tetap diperlukan sebelum membandingkan konsentrasi.'}:cov>=90?{good:true,title:'High coverage for the selected pollutant',detail:`${labels[p]} pada ${selected.name} (${y}) memiliki ${integer(usable)} dari ${integer(expected)} jam unik yang dapat digunakan (${num(cov,1)}%). Tetap periksa episode ekstrem serta kemungkinan perubahan alat.`}:cov>=75?{good:false,title:'Moderate coverage · review missing periods',detail:`${labels[p]} pada ${selected.name} (${y}) memiliki cakupan ${num(cov,1)}%. Pertimbangkan kelengkapan per bulan dan jumlah hari layak sebelum menyimpulkan tren.`}:{good:false,title:'Low coverage · interpretation should be limited',detail:`${labels[p]} pada ${selected.name} (${y}) hanya mempunyai cakupan ${num(cov,1)}% (${integer(usable)} jam). Hasil tren atau pemeringkatan berisiko tidak representatif.`};
$('qaQualityVerdict').innerHTML=`<div class="qa-verdict-title"><span class="qa-verdict-dot ${verdict.good?'good':'warn'}"></span>${safe(verdict.title)}</div><p>${safe(verdict.detail)}</p>`;
}
/* Add-ons sourced from the official Gelar Rasa 2026 booklet and original synthetic data. */
function caseNumber(v,dp=2){return Number.isFinite(v)?num(v,dp):'—'}
function caseSite(){return CASE?.meta.find(m=>m.sensor===state.station)}
function renderOverviewCase(){if(!CASE)return;const e=$('caseBenchmark'),p=state.param,y=state.year;
 if(p!=='pm25'&&p!=='pm10'){
 e.textContent=`${labels[p]}: benchmark 24 jam tidak dihitung pada panel ini. Gunakan periode sesuai regulasi.`;return}
 const dayLimit=p==='pm25'?55:75,yearLimit=p==='pm25'?15:40,rows=okRows(state.station,y,p),high=rows.filter(r=>r[1+paramIndex[p]]>dayLimit).length;
 const annualCoverage=rows.length/daysIn(y),annual=mean(rows.map(r=>r[1+paramIndex[p]])),full=y!=='2026'&&annualCoverage>=.75;
 e.innerHTML=`<div class="benchmark-line" title="Jumlah hari layak analisis di atas pembanding 24 jam PP 22/2021; bukan status kepatuhan resmi"><span>PP22 · 24 JAM</span><strong>${high}/${rows.length} hari &gt;${dayLimit} µg/m³</strong></div><div class="benchmark-line" title="Pembanding tahunan PP 22/2021; indikatif dan bukan evaluasi baku mutu resmi"><span>PP22 · TAHUNAN</span><strong>${full?`${num(annual,1)} vs ${yearLimit} µg/m³`:`${y==='2026'?'2026 parsial':'cakupan tidak memadai'}`}</strong></div><div class="benchmark-caption">Perbandingan indikatif, bukan evaluasi resmi.</div>`;
}
function renderSpatialCase(){if(!CASE)return;const m=caseSite(),d=CASE.air[state.station]?.[state.year],rankEl=$('fullRanking');
 $('caseRankStations').classList.toggle('active',caseRankMode==='station');$('caseRankIslands').classList.toggle('active',caseRankMode==='island');
 if(caseRankMode==='island'){
  const grouped={};for(const r of eligibleStations(state.year,state.param,120)){
   const island=CASE.meta.find(z=>z.sensor===r.s.id)?.island||'Lainnya';(grouped[island]??=[]).push(r.val)
  }
  const groups=Object.entries(grouped).map(([name,vals])=>({name,n:vals.length,mean:mean(vals)})).sort((a,b)=>b.mean-a.mean);const mx=groups[0]?.mean||1;
  rankEl.innerHTML=groups.map((z,i)=>`<div class="rank-line" title="${z.n} stasiun layak; ${labels[state.param]}"><span class="rank-no">${String(i+1).padStart(2,'0')}</span><span class="rank-label">${safe(z.name)} <small>(${z.n})</small></span><span class="rank-track"><i class="rank-fill" style="width:${100*z.mean/mx}%"></i></span><span class="rank-num">${caseNumber(z.mean,1)}</span></div>`).join('')+`<div class="case-ranking-note">${labels[state.param]} · min. 120 hari per stasiun. Rerata antarstasiun berbobot sama; bukan rerata seluruh pulau.</div>`;
 }
 const hourly=$('caseHourly'),day=$('caseDaytype'),drivers=$('caseDrivers');if(!d){hourly.innerHTML='<span class="muted">PM2.5 µg/m³ tidak dapat dibandingkan untuk stasiun ini.</span>';day.textContent='';drivers.textContent='Data tidak tersedia';return}
 const pollutant=state.param,scope=`${labels[pollutant]} · 24 JAM`,vals=V8?.pollHourly?.[state.station]?.[state.year]?.[pollutant] || d.hours;
 $('caseHourScope').textContent=scope;
 const good=vals.filter(Number.isFinite),mx=Math.max(1,...good);
 hourly.innerHTML='<div class="case-hour-bars">'+vals.map((v,i)=>`<div class="case-hour-cell" data-tip="${i.toString().padStart(2,'0')}:00 WIB · ${caseNumber(v,1)} µg/m³ · ${labels[pollutant]}" tabindex="0"><div class="case-hour-fill" style="height:${Number.isFinite(v)?Math.max(3,100*v/mx):0}%"></div></div>`).join('')+'</div><div class="case-hour-labels"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>';attachTips(hourly);
 const rows=okRows(state.station,state.year,pollutant),weekday=[],weekend=[];
 rows.forEach(r=>{const dow=new Date(r[0]+'T12:00:00Z').getUTCDay();(dow===0||dow===6?weekend:weekday).push(r[1+paramIndex[pollutant]])});
 const wd=mean(weekday),we=mean(weekend),top=vals.indexOf(Math.max(...good));
 day.innerHTML=`<div><span>Sen–Jum</span><b>${caseNumber(wd,1)}</b></div><div><span>Sab–Min</span><b>${caseNumber(we,1)}</b></div><div><span>Puncak jam ${labels[pollutant]}</span><b>${top<0?'—':String(top).padStart(2,'0')+':00'}</b></div>`;
 const cw=d.weatherR, cross=CASE.cross[state.year];
 const context=[['Suhu (r)',cw.temp],['Kelembapan (r)',cw.rh],['Angin (r)',cw.wind]];
 const wind=(V8?.circularWind?.[state.station]?.[state.year]||d.sector).map((value,i)=>({sec:['N','NE','E','SE','S','SW','W','NW'][i],value})).filter(v=>Number.isFinite(v.value)).sort((a,b)=>b.value-a.value)[0];
 drivers.innerHTML=`<div class="case-site-row"><span>${safe(m.siteType)}</span><strong>${safe(m.island)}</strong></div><div class="case-driver-three">${context.map(([label,n])=>`<div><small>${label}</small><b>${caseNumber(n,2)}</b></div>`).join('')}</div><div class="case-site-row"><span>Jarak jalan</span><strong>${caseNumber(m.road,0)} m</strong><span>Lalu lintas</span><strong>${caseNumber(m.traffic,0)}/jam</strong></div><div class="case-site-row"><span>Sektor angin tertinggi*</span><strong>${wind?safe(wind.sec)+' · '+caseNumber(wind.value,1):'—'}</strong><span>Lintas stasiun: trafik (r)</span><strong>${caseNumber(cross.trafficR,2)}</strong></div><div class="case-driver-note">β PM2.5 terstandar (kontrol bulan & hari): T ${caseNumber(d.adjustedBeta?.temp,2)} · RH ${caseNumber(d.adjustedBeta?.rh,2)} · angin ${caseNumber(d.adjustedBeta?.wind,2)}. Hasil asosiasi, bukan penyebab. Trafik = estimasi lokasi; arah angin memakai rerata sirkular.</div>`;
}
function healthPretty(key){return ({resp:'Rawat pernapasan umum',resp_admissions_under5:'ISPA balita',resp_admissions_over60:'ISPA lansia',asthma_emergency_cases:'Darurat asma',copd_admissions:'PPOK',cvd:'Penyakit kardiovaskular',death:'Kematian'})[key]||key}
function caseScatterDraw(rec){const element=$('caseScatter');if(!rec?.points?.length){element.innerHTML='<div class="case-chart-empty">Tidak cukup pasangan PM2.5 harian yang dapat dianalisis (unit/cakupan data).</div>';return}
 const v=rec.points,w=690,h=185,p={l:45,r:18,t:10,b:24};const xs=v.map(z=>z[0]),ys=v.map(z=>z[1]);let xmin=Math.min(...xs),xmax=Math.max(...xs),ymax=Math.max(...ys)*1.15;
 if(xmax===xmin)xmax=xmin+1;if(!ymax)ymax=1;
 const X=x=>p.l+(x-xmin)/(xmax-xmin)*(w-p.l-p.r),Y=y=>h-p.b-(y/ymax)*(h-p.b-p.t);
 let html='';for(let i=0;i<=4;i++){const y=(h-p.b)-(i/4)*(h-p.b-p.t);html+=`<line class="chart-grid" x1="${p.l}" x2="${w-p.r}" y1="${y}" y2="${y}"/><text class="axis-label" x="${p.l-7}" y="${y+4}" text-anchor="end">${num(i*ymax/4,0)}</text>`}
 html+=`<line x1="${p.l}" y1="${h-p.b}" x2="${w-p.r}" y2="${h-p.b}" stroke="#52716b"/><text class="axis-label" x="${p.l}" y="${h-5}">${caseNumber(xmin,0)}</text><text class="axis-label" text-anchor="end" x="${w-p.r}" y="${h-5}">${caseNumber(xmax,0)} µg/m³</text>`;
 for(const [x,y,n] of v){const r=Math.min(7,Math.max(4,Math.sqrt(n)*.72));html+=`<circle cx="${X(x).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${r.toFixed(1)}" fill="#C7F36B" fill-opacity=".8" stroke="#eff9cf" stroke-width="1" tabindex="0" data-tip="PM2.5 ≈ ${caseNumber(x,1)} µg/m³ · ${safe(healthPretty(caseOutcome))} ≈ ${caseNumber(y,1)}/hari · ${n} pasangan"/>`}
 element.innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Rerata indikator kesehatan dalam kelompok kuantil PM2.5">${html}</svg>`;attachTips(element);
}
function renderHealthCase(){if(!CASE)return;
 const hsId=healthStationOverride||state.station,s=CASE.meta.find(z=>z.sensor===hsId),data=CASE.health[hsId]?.[state.year],year=state.year;const rec=CASE.pairs[hsId]?.[year]?.[String(caseLag)]?.[caseOutcome];
 $('hospitalSelect').value=s?.hospital||'';state.hospital=s?.hospital;$('casePairLabel').textContent=s?`${s.name} ↔ ${s.hospital}${s.unitsOk?'':' · satuan PM2.5 belum dapat disetarakan'}`:'';
 const hos=DB.hospitals.find(h=>h.id===s?.hospital);
 $('hospitalContext').textContent=`${hos?.name||s?.hospital||'—'} · ${year} · PM2.5`;
 if(!data){$('caseHealthInterpretation').textContent='Tidak ada data kesehatan pada filter ini.';return}
 $('hCorr').textContent=caseNumber(rec?.r,3);$('hPaired').textContent=integer(rec?.n||0);$('hUnder5').textContent=caseNumber(data.overall.resp_admissions_under5,1);$('hOver60').textContent=caseNumber(data.overall.resp_admissions_over60,1);
 const series=[{name:healthPretty(caseOutcome),color:'#C7F36B',vals:data[caseOutcome]}];
 if(caseOutcome==='resp_admissions_under5')series.push({name:'ISPA lansia',color:'#edba7a',vals:data.resp_admissions_over60});
 if(caseOutcome==='resp_admissions_over60')series.push({name:'ISPA balita',color:'#edba7a',vals:data.resp_admissions_under5});
 lineChart('healthTrend',series,'kasus/hari');$('caseHealthTrendNote').textContent=`${healthPretty(caseOutcome)} · rata-rata kasus per hari pada RS ${s?.hospital}, ${year}; bukan tingkat risiko populasi.`;
 $('caseScatterLabel').textContent=`PM2.5 · LAG ${caseLag}`;caseScatterDraw(rec);
 let interpretation='Tidak tersedia pasangan kualitas udara yang layak dibandingkan.';
 if(rec?.n>=30&&Number.isFinite(rec.r)){let strength=Math.abs(rec.r)<.20?'sangat lemah':Math.abs(rec.r)<.40?'lemah':Math.abs(rec.r)<.60?'sedang':'relatif kuat';interpretation=`Terdapat asosiasi linear ${rec.r>=0?'positif':'negatif'} ${strength} (r=${num(rec.r,3)}) pada ${rec.n} pasangan hari. Nilai ini tidak menunjukkan besarnya dampak sebab-akibat.`}
 else if(rec?.n) interpretation=`Hanya tersedia ${rec.n} pasangan hari yang memenuhi syarat; korelasi tidak ditafsirkan.`;
 const model=V8?.adjustedHealth?.[hsId]?.[year]?.[String(caseLag)]?.[caseOutcome],v=V8?.vulnerableContrast?.[hsId]?.[year];
 $('hAdjusted').innerHTML=model?`<span>ASOSIASI DISESUAIKAN · +10 µg/m³ PM2.5</span><strong>${caseNumber(model.delta10,2)} kasus/hari</strong><small>95% CI HAC(7): ${caseNumber(model.ciLow,2)} hingga ${caseNumber(model.ciHigh,2)} · n=${model.n}</small>`:'<small>Model penyesuaian tidak tersedia (cakupan, variasi atau satuan PM2.5 belum memadai).</small>';
 let vulnerable='';if(v){const u=v.under5,o=v.over60;vulnerable=`<div class="v8-vulnerability" title="Kuartil PM2.5 rendah vs tinggi, hanya gambaran deskriptif; bukan perbandingan risiko"><strong>ISPA BALITA / LANSIA · KUARTIL PM2.5</strong><div>Balita: ${caseNumber(u[0],1)} → ${caseNumber(u[1],1)} kasus/hari · lansia: ${caseNumber(o[0],1)} → ${caseNumber(o[1],1)} kasus/hari</div></div>`}
 $('caseHealthInterpretation').innerHTML=`<strong>${safe(healthPretty(caseOutcome))} · ${year}</strong><p>${safe(interpretation)}</p>${vulnerable}<p>Model menyesuaikan suhu, RH, angin, bulan, hari, dan tren; interval HAC(7). Asosiasi ≠ kausalitas; angka bukan risiko per kapita.</p>`;
 const all=CASE.pairs[hsId]?.[year]||{};
 $('caseLagStrip').innerHTML=`<div class="case-lag-caption">KORELASI MENURUT LAG · KLIK UNTUK MEMILIH</div><div class="case-lag-buttons">${[0,1,2,3].map(i=>`<button type="button" class="case-mini ${caseLag===i?'active':''}" data-lag="${i}">L${i} · ${caseNumber(all[String(i)]?.[caseOutcome]?.r,2)}</button>`).join('')}</div>`;
 $('caseLagStrip').querySelectorAll('[data-lag]').forEach(b=>b.addEventListener('click',()=>{caseLag=Number(b.dataset.lag);$('caseLag').value=String(caseLag);renderHealth()}));
}
function renderNetworkCase(){if(!CASE||!V8)return;const el=$('caseNetwork'),arr=V8.networkReview?.[state.year]||[],islands=[...new Set(CASE.meta.map(z=>z.island))].length;
 const top=arr.slice(0,3);el.innerHTML=`<div class="case-network-title">NETWORK REVIEW · ${islands} PULAU · ${CASE.meta.length} TITIK SINTETIS</div><div class="v8-network-top">${top.map((m,i)=>`<div title="Skor prioritas audit sintetis: ${(m.score)}; jarak terdekat ${m.nearest} km; QC hour coverage ${m.qcCov}%"><span>${i+1}. ${safe(m.name)} (${safe(m.island)})</span><b>${caseNumber(m.score,1)}</b></div>`).join('')}</div><div class="case-network-sub">Skor telaah: 40% celah cakupan QC + 40% isolasi jarak antartitik + 20% keterwakilan pulau (normalisasi skenario).</div><div class="case-driver-note">Bukan rekomendasi lokasi pembangunan AQMS aktual. Keterwakilan dataset sintetis tidak sama dengan kecukupan jaringan nyata.</div>`;
}

function renderAll(){updateNotice();renderOverview();renderOverviewCase();renderExplore();renderSpatialCase();renderEpisodes();renderHealth();renderQuality();renderNetworkCase();if(state.page==='advanced'){ $('globalNotice').hidden=true;window.JEJAK_ADVANCED?.render() }}
initControls();renderAll();
})();
