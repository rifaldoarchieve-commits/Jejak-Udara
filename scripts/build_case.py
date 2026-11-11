"""Build compact case-study analytics. Only contest source CSV; standards source is PP22/2021 Annex VII.
Produce data/case.js, excludes raw hourly/individual patient records. For PM2.5, 18 valid unique hours/day;
all health outcomes are counts per synthetic hospital-day, not patient-level nor incidence.
"""
from pathlib import Path
import numpy as np, pandas as pd, json, os, sys, math
root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data');output_path=Path(__file__).resolve().parents[1]/'data'/'case.js'
start=pd.Timestamp('2024-01-01');end=pd.Timestamp('2026-10-15')
site=pd.read_csv(root/'sites.csv'); sensors=pd.read_csv(root/'sensors.csv'); hosp=pd.read_csv(root/'hospitals.csv'); health=pd.read_csv(root/'HLT-01_health_outcomes_daily.csv',low_memory=False)
info=sensors.merge(site,on='location_id',validate='one_to_one')
pollutants=['pm25','pm10','no2','so2','o3','co']
outs=['resp_admissions_under5','resp_admissions_over60','asthma_emergency_cases','copd_admissions','resp','cvd','death']
areas={
'Aceh':'Sumatra','Sumatera Utara':'Sumatra','Sumatera Barat':'Sumatra','Riau':'Sumatra','Kepulauan Riau':'Sumatra','Jambi':'Sumatra','Bengkulu':'Sumatra','Lampung':'Sumatra','Sumatera Selatan':'Sumatra',
'DKI Jakarta':'Jawa','Jawa Barat':'Jawa','Jawa Timur':'Jawa','DI Yogyakarta':'Jawa','D.I. Yogyakarta':'Jawa',
'Kalimantan Tengah':'Kalimantan','Kalimantan Barat':'Kalimantan','Kalimantan Timur':'Kalimantan','Kalimantan Selatan':'Kalimantan',
'Sulawesi Selatan':'Sulawesi','Sulawesi Tengah':'Sulawesi',
'Papua Barat Daya':'Papua','Papua Selatan':'Papua'
}

def clean(s,lo=None,hi=None):
 s=pd.to_numeric(s,errors='coerce').replace([np.inf,-np.inf],np.nan)
 if lo is not None:s=s.where(s>=lo)
 if hi is not None:s=s.where(s<=hi)
 return s

def corr(a,b,min_n=25):
 xy=pd.concat([pd.Series(a).reset_index(drop=True),pd.Series(b).reset_index(drop=True)],axis=1).dropna()
 if len(xy)<min_n or xy.iloc[:,0].std()==0 or xy.iloc[:,1].std()==0:return None
 return round(float(xy.iloc[:,0].corr(xy.iloc[:,1])),4)

def fil(v):return round(float(v),3) if pd.notna(v) and np.isfinite(v) else None

hs=health.copy();hs['date']=pd.to_datetime(hs.date,errors='coerce');hs=hs[hs.date.ge(start)&hs.date.lt(end)].copy();hs['hospital_id']=hs.hospital_id.astype(str)
for c in outs:hs[c]=clean(hs[c],0)
# Source-provided explicit table maps SENS-001...027 to RS-XXX-01...27.
agg={};annual={};monthly={};dailyAir={};byIsland={};coord={};
allMeta=[]
for fp in sorted(root.glob('*_AQMS.csv')):
 try:d=pd.read_csv(fp,low_memory=False)
 except Exception as e: print(fp,e);continue
 sid=str(d.sensor_id.dropna().iloc[0]); rec=info[info.sensor_id.eq(sid)].iloc[0]; h_id=f'RS-XXX-{int(sid.split("-")[-1]):02d}'
 assert h_id in set(hosp.hospital_id), (sid,h_id)
 island=areas.get(str(rec.provinsi),'Lainnya'); allowed='pm25_ug_m3' in d.columns
 recOut={'sensor':sid,'hospital':h_id,'name':fp.stem.replace('_AQMS','').split('_',1)[1], 'province':str(rec.provinsi),'island':island,'siteType':str(rec.site_type),
         'road':fil(rec.distance_to_road_m),'traffic':fil(rec.traffic_intensity_per_h),'baseline':fil(rec.baseline_pm25),'unitsOk':allowed}
 allMeta.append(recOut)
 if not allowed:continue
 ts=pd.to_datetime(d.timestamp_start,errors='coerce');valid=d.qc_flag.eq('VALID')&ts.ge(start)&ts.lt(end)
 sub=d.loc[valid,['pm25_ug_m3','temperature_c','humidity_pct','wind_speed_ms','wind_direction_deg']].copy()
 sub['hour']=ts[valid].dt.floor('h').values
 for c in sub.columns:
  if c=='hour':continue
  if c=='pm25_ug_m3':sub[c]=clean(sub[c],0)
  if c=='temperature_c':sub[c]=clean(sub[c],-40,60)
  if c=='humidity_pct':sub[c]=clean(sub[c],0,100)
  if c=='wind_speed_ms':sub[c]=clean(sub[c],0,80)
  if c=='wind_direction_deg':sub[c]=clean(sub[c],0,360)
 # group each distinct hour, to avoid weighting 15-min records more
 h=sub.groupby('hour',sort=True).mean(numeric_only=True)
 h['year']=h.index.year.astype(str);h['month']=h.index.month;h['clock']=h.index.hour;h['day']=h.index.floor('D')
 h['sector']=pd.cut((h.wind_direction_deg+22.5)%360,bins=[0,45,90,135,180,225,270,315,360],labels=['N','NE','E','SE','S','SW','W','NW'],right=False)
 goodh=h[h.pm25_ug_m3.notna()].copy()
 daily=goodh.groupby('day').agg(pm=('pm25_ug_m3','mean'),hours=('pm25_ug_m3','size'),temp=('temperature_c','mean'),rh=('humidity_pct','mean'),wind=('wind_speed_ms','mean'))
 daily=daily[daily.hours>=18].copy()
 dailyAir[sid]=daily.pm.to_dict()
 agg[sid]={}; annual[sid]={};monthly[sid]={}
 for y in ['2024','2025','2026']:
  hd=goodh[goodh.year.eq(y)];dy=daily[daily.index.year==int(y)];
  ispv=dy.index.dayofweek<5
  hh=hd.groupby('clock').pm25_ug_m3.mean().reindex(range(24))
  mm=dy.groupby(dy.index.month).pm.mean().reindex(range(1,13))
  sector=hd.groupby('sector',observed=True).pm25_ug_m3.mean().reindex(['N','NE','E','SE','S','SW','W','NW'])
  # count exceedance at valid days. This is *indicative*, not legal compliance classification.
  above=(dy.pm>55).sum();
  daily_corr={c:corr(dy.pm,dy[c]) for c in ['temp','rh','wind']}
  # Exploratory partial association: standardized OLS betas controlling for month + day-of-week.
  # Diagnostics are association only, not causal inference; avoids attributing simple shared time patterns to weather.
  beta={'temp':None,'rh':None,'wind':None}; modelR2=None
  model=dy[['pm','temp','rh','wind']].dropna()
  if len(model)>=100 and model[['pm','temp','rh','wind']].std().gt(0).all():
   z=(model-model.mean())/model.std(ddof=0)
   mone=pd.get_dummies(model.index.month,prefix='m',drop_first=True,dtype=float).to_numpy()
   wone=pd.get_dummies(model.index.dayofweek,prefix='w',drop_first=True,dtype=float).to_numpy()
   design=np.column_stack([np.ones(len(z)),z[['temp','rh','wind']].to_numpy(),mone,wone])
   coefficients=np.linalg.lstsq(design,z.pm.to_numpy(),rcond=None)[0]
   for ix,key in enumerate(['temp','rh','wind']):beta[key]=fil(coefficients[ix+1])
   pred=design@coefficients
   modelR2=fil(1-np.mean((z.pm.to_numpy()-pred)**2)/np.var(z.pm.to_numpy()))
  agg[sid][y]={
   'hours':[fil(z) for z in hh],
   'daytype':[fil(dy.pm[ispv].mean()),fil(dy.pm[~ispv].mean())],
   'sector':[fil(z) for z in sector],
   'weatherR':daily_corr,'adjustedBeta':beta,'modelR2':modelR2,
   'nDays':int(len(dy)), 'above55':int(above), 'shareAbove55':fil(100*above/len(dy)) if len(dy) else None,
   'peakHour':int(hh.idxmax()) if hh.notna().any() else None,
   'mean':fil(dy.pm.mean()),
  }
  monthly[sid][y]=[fil(z) for z in mm]
  annual[sid][y]=fil(dy.pm.mean())
  if len(dy)>=100:byIsland.setdefault(island,{}).setdefault(y,[]).append((sid,float(dy.pm.mean()),len(dy)))
 print('processed',sid,recOut['name'], len(daily),'daily')

# Outcome stats and correlations, PM2.5 only. Synthetic hospital-day counts.
healthMonthly={};pairs={};
for r in allMeta:
 sid=r['sensor'];hid=r['hospital'];hd=hs[hs.hospital_id.eq(hid)].sort_values('date').set_index('date')
 healthMonthly[sid]={};pairs[sid]={}
 for year in ['2024','2025','2026']:
  year_df=hd.loc[hd.index.year==int(year),outs]
  healthMonthly[sid][year]={out:[fil(v) for v in year_df.groupby(year_df.index.month)[out].mean().reindex(range(1,13))] for out in outs}
  healthMonthly[sid][year]['overall']={out:fil(year_df[out].mean()) for out in outs}
  healthMonthly[sid][year]['n']=int(len(year_df))
  pairs[sid][year]={}
  if sid not in dailyAir:continue
  s_pm=pd.Series(dailyAir[sid],name='pm');s_pm.index=pd.to_datetime(s_pm.index)
  for lag in range(4):
   x=s_pm.copy();x.index=x.index+pd.Timedelta(days=lag)
   joined=year_df.join(x,how='left')
   pa={}
   for out in outs:
    xy=joined[['pm',out]].dropna()
    rho=corr(xy.pm,xy[out])
    n=int(len(xy))
    # Decile binned mean outcome for scatter, derived from paired daily data.
    scatter=[]
    if n>=30 and xy.pm.nunique()>15:
     try:
      bins=pd.qcut(xy.pm,q=min(12,n//15),duplicates='drop');g=xy.groupby(bins,observed=True).agg(x=('pm','mean'),y=(out,'mean'),n=(out,'size'))
      scatter=[[fil(z.x),fil(z.y),int(z.n)] for z in g.itertuples()]
     except ValueError:pass
    pa[out]={'r':rho,'n':n,'points':scatter}
   pairs[sid][year][str(lag)]=pa

# Island groups mean of station means; equal station weighting, not area/population.
islands={}
for isl,yrs in byIsland.items():
 islands[isl]={}
 for y,z in yrs.items():
  islands[isl][y]={'mean':fil(np.mean([item[1] for item in z])),'n':len(z),'names':[x[0] for x in z]}

# Network matrix: geographic separation of *listed* locations, not real national monitoring sufficiency.
# nearest station distance within the 27 supplied coordinates.
from math import radians,sin,cos,atan2,sqrt
def hav(a,b):
 lat1,lon1=np.radians([a.latitude_dd,a.longitude_dd]);lat2,lon2=np.radians([b.latitude_dd,b.longitude_dd]);
 dlat=lat2-lat1;dlon=lon2-lon1
 z=np.sin(dlat/2)**2+np.cos(lat1)*np.cos(lat2)*np.sin(dlon/2)**2
 return float(6371*2*np.arcsin(np.sqrt(z)))
for rec in allMeta:
 a=info[info.sensor_id.eq(rec['sensor'])].iloc[0]
 near=sorted([(hav(a,b),str(b.sensor_id)) for _,b in info.iterrows() if b.sensor_id!=rec['sensor']])
 rec['nearKm']=round(near[0][0],1)
 rec['nearName']=next((m['name'] for m in allMeta if m['sensor']==near[0][1]),near[0][1])

# Site factors across stations (association only) during chosen year.
cross={};
for y in ['2024','2025','2026']:
 good=[{**m,'value':agg[m['sensor']][y]['mean']} for m in allMeta if m['sensor'] in agg and agg[m['sensor']][y]['nDays']>=120]
 cross[y]={'trafficR':corr([m['traffic'] for m in good],[m['value'] for m in good],min_n=8),
           'roadR':corr([m['road'] for m in good],[m['value'] for m in good],min_n=8),'n':len(good)}

output_path.parent.mkdir(parents=True,exist_ok=True)
obj={'meta':allMeta,'air':agg,'health':healthMonthly,'pairs':pairs,'islands':islands,'cross':cross,
     'method':{'standard_pm25_24h':55,'source':'PP 22/2021 Lampiran VII','minHour':18,'ispu':'ISPU resmi tidak dihitung; hanya pembanding indikatif PM2.5 24 jam','mapping':'Booklet Case Study DA Gelar Rasa 2026 halaman 4–7: SENS-001..027 ↔ RS-XXX-01..27','synthetic':True}}
output_path.write_text('window.JEJAK_CASE='+json.dumps(obj,ensure_ascii=False,separators=(',',':'),allow_nan=False)+';\n',encoding='utf-8')
print('OUTPUT',output_path, round(output_path.stat().st_size/1e6,2),'MB', 'matched health',len(pairs))
print('SENS1 2025',agg['SENS-001']['2025']);print('2024 Pearson R',pairs['SENS-001']['2024']['0']['resp']['r'])
