from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
for path in ['css/style.css','css/viewport.css','css/case.css']:
 html=html.replace(f'<link rel="stylesheet" href="{path}"/>','<style>'+ (root/path).read_text(encoding='utf-8')+'</style>')
for path in ['data/data.js','data/quality.js','data/case.js','data/v8.js','assets/map_geometry.js','js/viewport.js','js/app.js']:
 html=html.replace(f'<script src="{path}"'+(' defer' if path.startswith('js/') else '')+'></script>','<script>'+(root/path).read_text(encoding='utf-8')+'</script>')
for bad in ['<link rel="stylesheet"','<script src=']:
 assert bad not in html, bad
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for width,height in [(1366,768),(1536,864)]:
  pg=b.new_page(viewport={'width':width,'height':height})
  errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.goto('about:blank')
  pg.set_content(html,wait_until='load',timeout=60000)
  pg.wait_for_timeout(800)
  for page in ['overview','explore','episodes','health','quality']:
   pg.locator(f'.navtab[data-page="{page}"]').click()
   pg.wait_for_timeout(200)
   if width==1366: pg.screenshot(path=str(root.parent/f'Jejak_Udara_CaseStudy_{page}.png'))
   print(width,page,'visible',pg.locator('#page-'+page).is_visible(), 'errors',errors[:2], 'size',pg.evaluate('''() => ({scrollHeight:document.documentElement.scrollHeight,innerHeight:innerHeight,shell:document.querySelector('.app-shell').getBoundingClientRect().height,health:document.querySelector('#page-health').getBoundingClientRect().height})'''))
  # Test case filters, button navigation, map click
  pg.locator('.navtab[data-page="health"]').click()
  pg.locator('#caseOutcome').select_option('resp_admissions_under5')
  pg.locator('#caseLag').select_option('1')
  print('health header',pg.locator('#casePairLabel').inner_text(), 'pearson',pg.locator('#hCorr').inner_text(),'pairs',pg.locator('#hPaired').inner_text())
  pg.locator('.navtab[data-page="explore"]').click()
  pg.locator('#caseRankIslands').click()
  print('island ranking',pg.locator('#fullRanking').inner_text()[:200]);
  pg.close()
 b.close()
