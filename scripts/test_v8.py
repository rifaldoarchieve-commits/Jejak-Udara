from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
for path in ['css/style.css','css/viewport.css','css/case.css']:
 html=html.replace(f'<link rel="stylesheet" href="{path}"/>','<style>'+(root/path).read_text(encoding='utf-8')+'</style>')
for path in ['data/data.js','data/quality.js','data/case.js','data/v8.js','assets/map_geometry.js','js/viewport.js','js/app.js']:
 html=html.replace(f'<script src="{path}"'+(' defer' if path.startswith('js/') else '')+'></script>','<script>'+(root/path).read_text(encoding='utf-8')+'</script>')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1366,768),(1536,864),(1920,1080)]:
  page=b.new_page(viewport={'width':width,'height':height});err=[];page.on('pageerror',lambda e:err.append(str(e)))
  page.goto('about:blank');page.set_content(html,wait_until='load',timeout=120000)
  for name in ['overview','explore','episodes','health','quality']:
   page.locator(f'.navtab[data-page="{name}"]').click()
   assert page.locator('#page-'+name).is_visible()
   assert page.evaluate('document.documentElement.scrollHeight <= window.innerHeight'),(name,width,'document scroll')
   if width==1366:page.screenshot(path=str(root.parent/f'Jejak_Udara_V8_{name}.png'),full_page=False)
  # Spatial scope changes for every pollutant and island ranking
  page.locator('.navtab[data-page="explore"]').click()
  page.locator('#filterParam').select_option('pm25');pm25=page.locator('#caseHourly').inner_html()
  page.locator('#filterParam').select_option('pm10');pm10=page.locator('#caseHourly').inner_html()
  assert pm25!=pm10 and 'PM10' in page.locator('#caseHourScope').inner_text()
  page.locator('#caseRankIslands').click()
  rank10=page.locator('#fullRanking').inner_text();assert 'PM10' in rank10
  page.locator('#filterParam').select_option('co');rankco=page.locator('#fullRanking').inner_text();assert 'CO' in rankco and rankco!=rank10
  # Episodes PM25 PM10 and non-PM statistical threshold
  page.locator('.navtab[data-page="episodes"]').click()
  assert 'CO' in page.locator('#epThresholdTitle').inner_text() and page.locator('#epBenchmark').input_value()=='p95'
  assert page.locator('#epBenchmark option[value="pp22"]').is_disabled()
  page.locator('#filterParam').select_option('pm10');page.locator('#epBenchmark').select_option('pp22');assert page.locator('#epThreshold').inner_text()=='75,0'
  page.locator('#epBenchmark').select_option('who');assert page.locator('#epThreshold').inner_text()=='45,0'
  # health: fixed to pm25 independent of global pollutant; enhanced adjusted model
  page.locator('.navtab[data-page="health"]').click()
  assert page.locator('#filterParam').is_disabled()
  assert 'ASOSIASI DISESUAIKAN' in page.locator('#hAdjusted').inner_text(),page.locator('#hAdjusted').inner_text()
  assert 'KUARTIL PM2.5' in page.locator('#caseHealthInterpretation').inner_text()
  page.locator('#caseLag').select_option('2');assert 'ASOSIASI DISESUAIKAN' in page.locator('#hAdjusted').inner_text()
  page.locator('.navtab[data-page="quality"]').click()
  assert not page.locator('#filterParam').is_disabled()
  assert 'Skor telaah' in page.locator('#caseNetwork').inner_text()
  assert not err,err
  print('V8 PASSED',width,height,'filters, model, network, overflow')
  page.close()
 b.close()
