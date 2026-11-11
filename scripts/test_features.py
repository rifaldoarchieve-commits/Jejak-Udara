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
  page.goto('about:blank');page.set_content(html,wait_until='load',timeout=60000)
  for name in ['overview','explore','episodes','health','quality']:
   page.locator(f'.navtab[data-page="{name}"]').click()
   assert page.locator('#page-'+name).is_visible()
   assert page.evaluate('document.documentElement.scrollHeight <= window.innerHeight'),(name,width,'scroll')
   # Check whether visible tile contents overflow beyond tile box or its inner scroll container.
   bad=page.evaluate('''() => [...document.querySelectorAll('.dashboard-page.active .tile')].filter(e=> e.scrollHeight > e.clientHeight + 12).map(e=>[e.className,e.scrollHeight,e.clientHeight])''')
   if bad:print('TILE_OVERFLOW',width,name,bad[:5])
  page.locator('.navtab[data-page="episodes"]').click()
  page.locator('#epBenchmark').select_option('who');assert page.locator('#epThreshold').inner_text()=='15,0'
  page.locator('#epBenchmark').select_option('pp22');assert page.locator('#epThreshold').inner_text()=='55,0'
  page.locator('.navtab[data-page="explore"]').click()
  page.locator('#caseRankIslands').click();assert 'Jawa' in page.locator('#fullRanking').inner_text()
  page.locator('#caseRankStations').click();assert 'Marunda' in page.locator('#fullRanking').inner_text()
  page.locator('.navtab[data-page="health"]').click()
  page.locator('#caseOutcome').select_option('resp_admissions_under5');page.locator('#caseLag').select_option('2');assert page.locator('#casePairLabel').inner_text().startswith('Gambir')
  r1=page.locator('#hCorr').inner_text()
  page.locator('#hospitalSelect').select_option('RS-XXX-24')
  assert 'Medan' in page.locator('#casePairLabel').inner_text()
  assert page.locator('#hCorr').inner_text()=='—'
  assert page.locator('#hUnder5').inner_text()!='—'
  page.locator('#hospitalSelect').select_option('RS-XXX-05');assert 'Sampit' in page.locator('#casePairLabel').inner_text()
  page.locator('.navtab[data-page="quality"]').click();page.locator('#qaModeFiltered').click()
  assert 'Sampit' in page.locator('#qaScopeLabel').inner_text()
  page.locator('#filterYear').select_option('2024')
  assert '2024' in page.locator('#qaScopeLabel').inner_text()
  print('PASSED',width,height,'all five tabs + benchmark + ranking + paired health + ppm limitation + QC filtered','JS_ERRORS:',err[:3]);assert not err,err
  page.close()
 b.close()
