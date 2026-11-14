# Validação técnica — 10/11/2026

## Executado

- 10 testes Python aprovados: página/status, isolamento da chave, origem/host, configuração ausente, PCM inválido, finalização, desconexão e timeout.
- 9 testes Node.js aprovados: limites e formato PCM, contagem de amostras em 16/44,1/48 kHz, snapshots repetidos, revisões, repetições legítimas, preservação de sessões e revisão manual.
- Playwright 1.59.0 com Edge/Chromium em modo headless: preferências persistentes/restauração; demonstração; edição e cancelamento; cópia real para clipboard; download UTF-8; ciclo de teclado nos diálogos; Escape; leitura ampliada; responsividade; texto a 200%; permissões negadas e cancelamento pendente.
- Captura sintética usando AudioContext e AudioWorklet reais, com respostas WebSocket interceptadas. Foram observados quadros PCM binários, finalização e duas sessões sem duplicar revisões. Nenhum áudio foi enviado à STT.ai nesta revisão.
- Capturas desktop e mobile inspecionadas visualmente.

## Auditoria automatizada

axe-core 4.14.0, regras etiquetadas `wcag2a`, `wcag2aa`, `wcag21aa` e `wcag22aa`. Foram avaliados sete estados: preferências em claro, escuro e alto contraste; demonstração concluída; diálogo de revisão; diálogo de limpeza; cores forçadas do sistema.

**Zero violações automáticas nos sete estados.** No estado de cores forçadas, o axe retornou **um item incompleto de color-contrast**, que exige inspeção manual e não deve ser contado como aprovação. O resultado detalhado está em [resultados-acessibilidade.json](resultados-acessibilidade.json).

Ausência de violações automáticas não significa conformidade integral. O relatório cobre somente os estados e regras executados, não toda a experiência humana ou todos os navegadores.

## Contraste dos principais pares de cores

Razões calculadas pela luminância relativa sRGB dos tokens CSS, sem transparência. As demais combinações renderizadas foram inspecionadas pelo axe nos estados acima.

| Tema | Texto principal / superfície | Texto secundário / superfície | Texto / fundo do botão principal |
| --- | --- | --- | --- |
| Claro | 14.53:1 | 6.61:1 | 8.16:1 |
| Escuro | 13.73:1 | 8.99:1 | 10.02:1 |
| Alto contraste | 21.00:1 | 21.00:1 | 17.20:1 |

## Reproduzir

Siga os comandos de testes do README. O relatório novo vai para `test-results/accessibility.json`; o arquivo em docs é um registro da execução desta revisão. Os testes do servidor foram executados com pytest 9.1.1 e dependências Python disponíveis no ambiente de desenvolvimento; os de navegador com Python 3.12 e Edge instalado. axe-core foi obtido do pacote oficial e informado por `--axe-file`. A execução normal usa o ambiente `.venv` já existente do projeto.

## Não verificado nesta revisão

- Precisão e latência da STT.ai com fala e microfone físicos; saldo/validade da chave não foram consultados.
- Leitura efetiva por NVDA, TalkBack ou VoiceOver.
- Navegadores Firefox/Safari, celulares físicos e HTTPS local em dispositivos externos.
- Zoom real de 400%, adaptação por usuários e conformidade integral WCAG/eMAG.

As melhorias tratam a interface, a captura e a gestão de estado; não eliminam erros do reconhecimento de fala externo.

## Revisão: filtragem das hipóteses iniciais

23 testes Python passaram, incluindo um fluxo WebSocket com Vosk misto, Whisper em português, hipótese Vosk tardia e final Whisper. Os testes cobrem supressão de partial, origem ausente, modo exclusivamente final, silêncio, revisão vazia e fallback Vosk com aviso. A configuração `language: pt` foi mantida.

A melhoria foi verificada com respostas simuladas, sem gastar créditos ou enviar áudio à STT.ai. O efeito na qualidade e no tempo de espera precisa de teste com fala real. `source` é um metadado observado na integração; caso não esteja disponível ou mude, o aplicativo aguarda o resultado final documentado (`is_final`).
