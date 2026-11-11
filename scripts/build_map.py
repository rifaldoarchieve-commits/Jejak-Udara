"""Build a presentation-only basemap from bundled Natural Earth geometry.
This asset supplies coastline shapes; no AQMS or health measurements originate here.
"""
import json, sys
from pathlib import Path
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import transform

base=Path(__file__).resolve().parents[1]
src=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/opt/pyvenv/lib/python3.13/site-packages/pyogrio/tests/fixtures/naturalearth_lowres/naturalearth_lowres.shp')
if not src.exists(): raise FileNotFoundError('Provide path to a Natural Earth country shapefile: python scripts/build_map.py /path/to/shapefile.shp')
gdf=gpd.read_file(src)
features={}
for name in ['Indonesia','Malaysia','Papua New Guinea','Brunei','Timor-Leste','Singapore','Philippines']:
    row=gdf[gdf['name']==name]
    if row.empty: continue
    geom=row.geometry.iloc[0]
    parts=list(geom.geoms) if isinstance(geom,MultiPolygon) else [geom]
    rings=[]
    for p in parts:
        if p.area < 0.007: continue
        rings.append([[round(float(x),4),round(float(y),4)] for x,y in p.exterior.coords])
    features[name]=rings
out=base/'assets'/'map_geometry.js'
out.write_text('/* Natural Earth low resolution country geometry (public domain). Basemap only, not analytical input. */\nwindow.JEJAK_GEOMETRY='+json.dumps(features,separators=(',',':'))+';\n',encoding='utf-8')
print('wrote',out, 'bytes',out.stat().st_size, 'polygons', {k:len(v) for k,v in features.items()})
