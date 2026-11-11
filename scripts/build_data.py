"""Build dashboard aggregates from the contest-supplied CSVs. No raw rows exported.
Run: python scripts/build_data.py /path/to/original_csv_folder
"""
import sys, json, math, glob, os
from pathlib import Path
import pandas as pd
import numpy as np
src=Path(sys.argv[1] if len(sys.argv)>1 else '/mnt/data')
out=Path(__file__).resolve().parents[1]/'data'/'data.js'
site=pd.read_csv(src/'sites.csv')
sensors=pd.read_csv(src/'sensors.csv')
joined=sensors.merge(site,on='location_id',how='left',validate='one_to_one')
station_meta=[]; daily={}; stats=[]
param=['pm25','pm10','no2','so2','o3','co']
start=pd.Timestamp('2024-01-01'); end=pd.Timestamp('2026-10-15')
for fp in sorted(src.glob('*_AQMS.csv')):
  df=pd.read_csv(fp, low_memory=False)
  sid=str(df.sensor_id.iloc[0]); r=joined.loc[joined.sensor_id==sid]
  if r.empty: raise ValueError(f'unmatched sensor {sid}')
  r=r.iloc[0]
  display=os.path.basename(fp).replace('_AQMS.csv','').split('_',1)[1]
  qc=df['qc_flag'].fillna('UNKNOWN').astype(str).value_counts().to_dict()
  stm={'id':sid,'name':display,'region':str(r['provinsi']),'city':str(r['kota_kabupaten']),'site':str(r['site_type']),
       'latitude':round(float(r.latitude_dd),5),'longitude':round(float(r.longitude_dd),5),
       'unit':str(r.pm25_unit),'rawRows':int(len(df)),'validRows':int(qc.get('VALID',0)),
       'qc':{k:int(v) for k,v in qc.items()},'status':str(r.status_operasional), 'file':os.path.basename(fp)}
  station_meta.append(stm)
  numeric_cols=[p+'_ug_m3' for p in param]
  if not all(c in df.columns for c in numeric_cols):
    daily[sid]=[]; stm['included']=False; stm['note']='Kolom konsentrasi menggunakan label satuan ppm; belum dapat disetarakan dengan µg/m³.';continue
  stm['included']=True
  ts=pd.to_datetime(df.timestamp_start,errors='coerce')
  valid=(df.qc_flag=='VALID') & ts.ge(start) & ts.lt(end)
  cleaned=df.loc[valid,numeric_cols].apply(pd.to_numeric,errors='coerce').replace([np.inf,-np.inf],np.nan)
  cleaned=cleaned.where(cleaned>=0)
  cleaned['hour']=ts[valid].dt.floor('h').to_numpy()
  # Each clock hour gets one average, even when 15-minute readings are present.
  hourly=cleaned.groupby('hour',as_index=False).mean(numeric_only=True)
  hourly['date']=pd.to_datetime(hourly.hour).dt.strftime('%Y-%m-%d')
  # A pollutant-specific coverage count is preserved separately from its mean.
  grouped=hourly.groupby('date',sort=True)
  avg=grouped[numeric_cols].mean()
  counts=grouped[numeric_cols].count()
  allhours=grouped.size()
  data=[]
  for d in avg.index:
    row=[d]
    for p in param:
      col=p+'_ug_m3'; val=avg.loc[d,col]
      row.append(round(float(val),2) if pd.notna(val) else None)
    row.extend([int(counts.loc[d,'pm25_ug_m3']),int(allhours.loc[d])])
    data.append(row)
  # Export count per pollutant too (for filter coverage).
  # shape: [date, pm25..co mean, pm25 n, QC-valid-hour count, pm10..co n]
  for i,d in enumerate(avg.index):
    data[i].extend([int(counts.loc[d,p+'_ug_m3']) for p in param[1:]])
  daily[sid]=data
  stm['days']=len(data)
  print(f'{stm["name"]:20s} {len(df):6d} rows  {len(data):4d} daily; VALID={stm["validRows"]}')
# Health monthly is deliberately separate: no station–hospital pairing is inferred.
health_df=pd.read_csv(src/'HLT-01_health_outcomes_daily.csv')
health_df['date']=pd.to_datetime(health_df.date,errors='coerce')
health_df=health_df[(health_df.date>=start)&(health_df.date<end)].copy()
health_df['month']=health_df.date.dt.strftime('%Y-%m')
hosp=pd.read_csv(src/'hospitals.csv')
hospitals=[]; health={}
for _,r in hosp.iterrows():
  hid=str(r.hospital_id)
  hospitals.append({'id':hid,'name':str(r.nama_rumah_sakit),'province':str(r.provinsi),'city':str(r.kota_kabupaten),'class':str(r.kelas_faskes)})
  subset=health_df.loc[health_df.hospital_id==hid]
  g=subset.groupby('month',sort=True)
  health[hid]=[[m,round(float(g['resp'].mean()[m]),2),round(float(g['asthma_emergency_cases'].mean()[m]),2),round(float(g['cvd'].mean()[m]),2),int(g.size()[m])] for m in g.size().index]
result={'info':{'start':'2024-01-01','end':'2026-10-14','stn':len(station_meta),'health':len(hospitals),
     'method':'QC VALID, numerik nonnegatif terhingga, timestamp dalam periode, rerata per jam unik, rerata harian, minimal 18 jam valid untuk KPI dan tren.','params':param,
     'generated':'2026-11-01','source':'CSV kompetisi DA Gelar Rasa 2026'},
        'stations':station_meta,'daily':daily,'hospitals':hospitals,'healthMonthly':health}
out.write_text('window.JEJAK_DATA = '+json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False)+';\n',encoding='utf-8')
print('SAVED',out,round(out.stat().st_size/1024/1024,2),'MB')
print('STATIONS',len(station_meta),'COMPARABLE',sum(s['included'] for s in station_meta),'TOTAL QC VALID',sum(s['validRows'] for s in station_meta))
