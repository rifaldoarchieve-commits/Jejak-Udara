"""Jejak Udara V8: derived analytics for revised Gelar Rasa case study.
Run: python scripts/build_v8.py /mnt/data
Only works on competition CSVs. No external scientific measurements.
Models are exploratory associations, NOT evidence of causal effects.
"""
from pathlib import Path
import json, sys
import numpy as np
import pandas as pd

root=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data')
out=Path(__file__).resolve().parents[1]/'data'/'v8.js'
raw=(out.parent/'case.js').read_text(encoding='utf-8').strip()
case=json.loads(raw[len('window.JEJAK_CASE='):].rstrip(';'))
Qjs=(out.parent/'quality.js').read_text(encoding='utf-8').strip()
# Keep QC as JSON only for coverage if schema recognized.
Q=json.loads(Qjs.split('=',1)[1].rstrip(';'))
health=pd.read_csv(root/'HLT-01_health_outcomes_daily.csv')
health['date']=pd.to_datetime(health.date)
health=health[(health.date>='2024-01-01')&(health.date<='2026-10-14')]
outs=['resp','resp_admissions_under5','resp_admissions_over60','asthma_emergency_cases','copd_admissions','cvd','death']
pol=['pm25','pm10','no2','so2','o3','co']
meta=case['meta']; stations={m['sensor']:m for m in meta}

def valid_numeric(x,lo=0,hi=None):
 z=pd.to_numeric(x,errors='coerce').replace([np.inf,-np.inf],np.nan)
 if lo is not None:z=z.where(z>=lo)
 if hi is not None:z=z.where(z<=hi)
 return z

def f(x,nd=3):return round(float(x),nd) if x is not None and pd.notna(x) and np.isfinite(x) else None

def adjusted_model(df,outcome):
 # association of +10 ug/m3 with cases/day, adjusted for meteorology + time patterns
 v=df[['pm','temp','rh','wind',outcome]].dropna()
 if len(v)<120 or v.pm.std()<.1 or v[outcome].std()<.05: return None
 day=v.index
 z=pd.DataFrame({'exposure10':v.pm.to_numpy()/10.,'temp':v.temp.to_numpy(),'rh':v.rh.to_numpy(),'wind':v.wind.to_numpy(),
                 'time':(day-day.min()).days.to_numpy(dtype=float)/365.25}, index=day)
 mo=pd.get_dummies(day.month.astype(str),prefix='month',drop_first=True,dtype=float).set_axis(day)
 wd=pd.get_dummies(day.dayofweek.astype(str),prefix='dow',drop_first=True,dtype=float).set_axis(day)
 X=np.column_stack([np.ones(len(z)),z.to_numpy(dtype=float),mo.to_numpy(),wd.to_numpy()]);Y=v[outcome].to_numpy(dtype=float)
 n,k=X.shape
 if n<=k+12 or np.linalg.matrix_rank(X)<k:return None
 coef=np.linalg.lstsq(X,Y,rcond=None)[0];e=Y-X@coef
 xxinv=np.linalg.pinv(X.T@X);scores=X*e[:,None];L=min(7,n-1)
 meat=scores.T@scores
 for h in range(1,L+1):
  w=1-h/(L+1); s=scores[h:].T@scores[:-h]; meat+=w*(s+s.T)
 cov=xxinv@meat@xxinv*n/(n-k)
 se=np.sqrt(max(0,cov[1,1])); b=coef[1]
 return {'delta10':f(b),'ciLow':f(b-1.96*se),'ciHigh':f(b+1.96*se),'n':n,'method':'OLS with HAC(7), time and weather adjusted'}

hourly={}; adjusted={}; vulnerabilities={}; sectors={}
for m in meta:
 sid=m['sensor'];fp=next(iter(root.glob('*_AQMS.csv'))) if False else None
 # sensor number uniquely resolves station via case metadata and source file prefix
 for candidate in root.glob('*_AQMS.csv'):
  if m['name'].replace(' ','').lower() in candidate.stem.lower().replace('_',''):
   fp=candidate;break
 if fp is None:
  # robust resolution by checking the prefix of each CSV first row
  for candidate in root.glob('*_AQMS.csv'):
   head=pd.read_csv(candidate,nrows=1)
   if str(head.sensor_id.iloc[0])==sid:fp=candidate;break
 if not m['unitsOk'] or fp is None: continue
 df=pd.read_csv(fp,low_memory=False)
 timestamps=pd.to_datetime(df.timestamp_start,errors='coerce')
 mask=df.qc_flag.eq('VALID')&timestamps.ge('2024-01-01')&timestamps.lt('2026-10-15')
 d=df.loc[mask].copy();d['hour']=timestamps.loc[mask].dt.floor('h').to_numpy()
 for p in pol:
  d[p]=valid_numeric(d.get(p+'_ug_m3',pd.Series(np.nan,index=d.index)))
 for name,col,lo,hi in [('temp','temperature_c',-40,60),('rh','humidity_pct',0,100),('wind','wind_speed_ms',0,80),('direction','wind_direction_deg',0,360)]:
  d[name]=valid_numeric(d[col],lo,hi)
 # Circular direction must be averaged as a vector, never raw-degree arithmetic.
 theta=np.deg2rad(d.direction);d['directionSin']=np.sin(theta);d['directionCos']=np.cos(theta)
 hours=d.groupby('hour')[pol+['temp','rh','wind','directionSin','directionCos']].mean().sort_index()
 hours['dirMean']=(np.degrees(np.arctan2(hours.directionSin,hours.directionCos))+360)%360
 hours['sector']=np.floor(((hours.dirMean+22.5)%360)/45).astype('Int64')
 # IMPORTANT: build all eligible daily exposure dates BEFORE restricting outcome year.
 # Lag 1-3 on Jan 1-3 must be allowed to use Dec 29-31 of preceding year.
 all_valid_pm=hours.dropna(subset=['pm25']).copy()
 daily_all=all_valid_pm.groupby(all_valid_pm.index.floor('D')).agg(pm=('pm25','mean'),n=('pm25','size'),temp=('temp','mean'),rh=('rh','mean'),wind=('wind','mean'))
 daily_all=daily_all[daily_all.n>=18].copy()
 daily_all.index.name='date'
 hourly[sid]={}; adjusted[sid]={}; vulnerabilities[sid]={};sectors[sid]={}
 for y in ['2024','2025','2026']:
  h=hours[hours.index.year==int(y)]
  hourly[sid][y]={};adjusted[sid][y]={};vulnerabilities[sid][y]={}
  for p in pol:
   val=h.dropna(subset=[p]); hourly[sid][y][p]=[f(z) for z in val.groupby(val.index.hour)[p].mean().reindex(range(24))]
  valid_pm=h.dropna(subset=['pm25']).copy()
  sect=valid_pm.groupby('sector')['pm25'].mean().reindex(range(8))
  sectors[sid][y]=[f(v) for v in sect]
  # Year-specific subset for the descriptive vulnerability contrast only.
  daily=daily_all[daily_all.index.year==int(y)].copy()
  # Join target cases with preceding exposures, never align future pollution to past outcome.
  hospital=m['hospital']; hos=health[(health.hospital_id==hospital)&(health.date.dt.year==int(y))].set_index('date')
  for lag in range(4):
   pm=daily_all[['pm','temp','rh','wind']].copy();pm.index=pm.index+pd.Timedelta(days=lag)
   joined=hos.join(pm,how='left')
   sub={};
   for outcome in outs:
    sub[outcome]=adjusted_model(joined,outcome)
   adjusted[sid][y][str(lag)]=sub
   if lag==0:
    j=joined[['pm','resp_admissions_under5','resp_admissions_over60']].dropna()
    if len(j)>=100:
     lower,upper=j.pm.quantile([.25,.75]); a=j[j.pm<=lower];b=j[j.pm>=upper]
     vulnerabilities[sid][y]={'nLow':len(a),'nHigh':len(b),'lowPM':f(a.pm.mean()),'highPM':f(b.pm.mean()),
      'under5':[f(a.resp_admissions_under5.mean()),f(b.resp_admissions_under5.mean())],
      'over60':[f(a.resp_admissions_over60.mean()),f(b.resp_admissions_over60.mean())]}
 print('V8',sid,m['name'],sum([len(hourly[sid][y]['pm25']) for y in hourly[sid]]))

# Synthetic-sample network diagnostic. The intent is to identify *review priority*, not propose actual sites.
network={};by_island={}
for m in meta:by_island[m['island']]=by_island.get(m['island'],0)+1
for y in ['2024','2025','2026']:
 arr=[];den={'2024':8784,'2025':8760,'2026':6888}[y]  # Jan 1 to Oct 14 includes 287 days
 for m in meta:
  sid=m['sensor']; yr=Q['years'].get(sid,{}).get(y)
  qc_coverage=max(0,min(1,(yr[2] if yr else 0)/den))
  space=min(m['nearKm']/500,1)
  scarcity=1-min(by_island[m['island']]/7,1)
  score=100*(.4*(1-qc_coverage)+.4*space+.2*scarcity)
  arr.append({'sid':sid,'name':m['name'],'island':m['island'],'qcCov':f(qc_coverage*100,1),'nearest':f(m['nearKm'],0),'score':f(score,1)})
 network[y]=sorted(arr,key=lambda x:-x['score'])

output={'pollHourly':hourly,'circularWind':sectors,'adjustedHealth':adjusted,'vulnerableContrast':vulnerabilities,'networkReview':network,
        'metadata':{'minimumHourly':18,'regression':'Exploratory OLS with HAC 7-day standard errors; exposure +10 ug/m3, adjusting weather, month, weekday, and time trend; no causal claims.',
                    'priorityFormula':'0.4 × (1 - QC-valid-hour coverage) + 0.4 × min(nearest km / 500 km, 1) + 0.2 × (1 - min(number of supplied stations on island / 7, 1)); multiplied by 100. Educational, not official.',
                    'circularWind':'Hourly wind direction computed by circular mean via sine and cosine components.', 'synthetic':True}}
out.write_text('window.JEJAK_V8='+json.dumps(output,ensure_ascii=False,allow_nan=False,separators=(',',':'))+';\n',encoding='utf-8')
print('OUTPUT',out,out.stat().st_size)
