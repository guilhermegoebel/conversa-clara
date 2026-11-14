"""Verificações reproduzíveis de interface; nenhuma chamada à STT.ai é feita."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://localhost:8000')
parser.add_argument('--axe-file', default='node_modules/axe-core/axe.min.js')
parser.add_argument('--output', default='test-results')
parser.add_argument('--channel', default='chromium', choices=['chromium', 'msedge'])
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
axe = Path(args.axe_file).resolve()
if not axe.is_file():
    raise SystemExit('Instale axe-core com npm install ou informe --axe-file.')
report = {'engine': 'axe-core', 'scans': [], 'functional': [], 'limitations': ['Microfone simulado; STT.ai interceptada.', 'NVDA, TalkBack e celulares físicos não avaliados.']}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel=args.channel, args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    context = browser.new_context(viewport={'width': 1280, 'height': 960}, permissions=['microphone', 'clipboard-read', 'clipboard-write'])
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/status', lambda route: route.fulfill(json={'configured': False}))
    page.goto(args.url)
    expect(page.locator('#toggle')).to_be_disabled()
    expect(page.locator('#demo')).to_be_enabled()
    page.locator('#preferences summary').click()

    def scan(name):
        page.add_script_tag(path=str(axe))
        result = page.evaluate("""async () => {
          const r = await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
          return {version:r.testEngine.version, violations:r.violations, incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})), passes:r.passes.length};
        }""")
        report['scans'].append({'state': name, **result})
        (out / 'accessibility.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        assert not result['violations'], [(v['id'], [n['target'] for n in v['nodes']]) for v in result['violations']]

    for theme in ['light', 'dark', 'contrast']:
        page.select_option('#theme', theme)
        scan('preferences-' + theme)
    page.select_option('#text-size', 'maximum')
    page.select_option('#spacing', 'wide')
    page.reload()
    expect(page.locator('html')).to_have_attribute('data-theme', 'contrast')
    expect(page.locator('html')).to_have_attribute('data-size', 'maximum')
    page.locator('#preferences summary').click()
    page.locator('#reset-settings').click()
    expect(page.locator('html')).to_have_attribute('data-theme', 'light')
    report['functional'].append('Preferências persistem e podem ser restauradas; conversa não é persistida.')

    page.locator('#preferences summary').click()
    page.locator('#demo').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#demo-notice')).to_be_visible()
    expect(page.locator('#status-text')).to_have_text('Conversa encerrada', timeout=10000)
    expect(page.locator('#transcript p')).to_have_count(1)
    expect(page.locator('#transcript')).to_contain_text('dez horas')
    scan('demo-complete')
    page.locator('#edit').focus()
    page.keyboard.press('Enter')
    expect(page.locator('#edit-text')).to_be_focused()
    scan('edit-dialog')
    page.locator('#edit-text').fill('Texto revisado.\n\nAté amanhã às dez horas.')
    page.keyboard.press('Tab')
    page.keyboard.press('Tab')
    page.keyboard.press('Enter')
    expect(page.locator('#edit')).to_be_focused()
    expect(page.locator('#transcript p')).to_have_count(2)
    page.locator('#copy').click()
    expect(page.locator('#feedback')).to_have_text('Texto copiado.')
    assert page.evaluate('navigator.clipboard.readText()').replace('\r\n', '\n') == 'Texto revisado.\n\nAté amanhã às dez horas.'
    with page.expect_download() as download:
        page.locator('#save').click()
    download.value.save_as(out / 'transcricao-teste.txt')
    assert (out / 'transcricao-teste.txt').read_text(encoding='utf-8-sig') == 'Texto revisado.\n\nAté amanhã às dez horas.\n'
    report['functional'].append('Demonstração, edição, cópia e download com acentos.')

    page.locator('#clear').click()
    scan('clear-dialog')
    expect(page.get_by_role('button', name='Cancelar', exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab')
    expect(page.get_by_role('button', name='Sim, limpar')).to_be_focused()
    page.keyboard.press('Tab')
    expect(page.get_by_role('button', name='Cancelar', exact=True)).to_be_focused()
    page.keyboard.press('Escape')
    expect(page.locator('#clear')).to_be_focused()
    expect(page.locator('#transcript')).to_contain_text('Texto revisado.')
    page.locator('#focus-mode').click()
    expect(page.locator('#focus-mode')).to_have_attribute('aria-pressed', 'true')
    page.keyboard.press('Escape')
    expect(page.locator('#focus-mode')).to_have_attribute('aria-pressed', 'false')
    for width in [320,390,768,1280]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(out / 'mobile.png'), full_page=True)
    page.set_viewport_size({'width':1280,'height':960})
    page.screenshot(path=str(out / 'desktop.png'), full_page=True)
    page.set_viewport_size({'width':640,'height':900})
    page.evaluate("document.documentElement.style.fontSize='200%'")
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.evaluate("document.documentElement.style.fontSize=''")
    page.emulate_media(forced_colors='active', reduced_motion='reduce')
    scan('system-forced-colors')
    page.emulate_media(forced_colors='none')
    report['functional'].append('Teclado em diálogos e leitura ampliada; larguras 320–1280, texto a 200% e cores forçadas.')
    page.locator('#clear').click()
    page.get_by_role('button', name='Sim, limpar').click()
    expect(page.locator('#transcript p')).to_have_count(0)

    # Simula só o servidor de reconhecimento. AudioContext e AudioWorklet são reais.
    live_context = browser.new_context(permissions=['microphone'])
    page = live_context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/api/status', lambda route: route.fulfill(json={'configured': True}))
    pcm_lengths = []
    sockets = []
    def websocket(route):
        sockets.append(route)
        route.send(json.dumps({'type':'ready'}))
        def receive(message):
            if isinstance(message, bytes):
                pcm_lengths.append(len(message))
                for _ in range(3):
                    route.send(json.dumps({'type':'transcript','text':'teste teste'}))
            else:
                route.send(json.dumps({'type':'transcript','text':'teste teste. Até amanhã.'}))
                route.send(json.dumps({'type':'done'}))
                route.close()
        route.on_message(receive)
    page.route_web_socket('**/ws/transcribe', websocket)
    page.goto(args.url)
    page.locator('#toggle').click()
    expect(page.locator('#status-text')).to_have_text('Ouvindo agora')
    expect(page.locator('#transcript')).to_have_text('teste teste', timeout=15000)
    expect(page.locator('#transcript p')).to_have_count(1)
    page.locator('#toggle').click()
    expect(page.locator('#status-text')).to_have_text('Conversa encerrada')
    expect(page.locator('#transcript')).to_have_text('teste teste. Até amanhã.')
    assert pcm_lengths and all(0 < size <= 32768 and size % 2 == 0 for size in pcm_lengths)
    # Outra sessão igual é legítima: não deduplicar entre sessões.
    page.locator('#toggle').click()
    expect(page.locator('#transcript p')).to_have_count(2)
    page.locator('#toggle').click()
    expect(page.locator('#status-text')).to_have_text('Conversa encerrada')
    assert page.locator('#transcript p').all_text_contents() == ['teste teste. Até amanhã.'] * 2
    report['functional'].append('Captura sintética via AudioWorklet real, PCM, finalização e sessões acumuladas sem duplicação de revisões.')
    page.evaluate("() => {navigator.mediaDevices.getUserMedia = async () => {throw new DOMException('negado', 'NotAllowedError');};}")
    page.locator('#toggle').click()
    expect(page.locator('#error')).to_contain_text('negado')
    expect(page.locator('#toggle-label')).to_have_text('Iniciar conversa')
    page.evaluate("() => {navigator.mediaDevices.getUserMedia = () => new Promise(resolve => {window.resolvePermission = resolve;});}")
    page.locator('#toggle').click()
    expect(page.locator('#toggle-label')).to_have_text('Cancelar início')
    page.locator('#toggle').click()
    page.evaluate("window.stoppedAfterCancel = false; resolvePermission({getTracks: () => [{stop: () => {window.stoppedAfterCancel = true;}}]})")
    page.wait_for_function('window.stoppedAfterCancel === true')
    expect(page.locator('#toggle-label')).to_have_text('Iniciar conversa')
    report['functional'].append('Permissão negada e cancelamento de uma permissão pendente liberam o microfone.')
    assert not errors, errors
    report['console_errors'] = errors
    report['passed'] = True
    (out / 'accessibility.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    live_context.close()
    context.close()
    browser.close()
print(json.dumps({'passed': True, 'scans':len(report['scans']), 'functional':report['functional']}, ensure_ascii=True))
