# Validação técnica da versão final

Consolidação documental: **15/11/2026**. A versão final está aprovada no escopo de aceitação do projeto. A equipe confirmou a realização e aprovação dos testes manuais que complementam a execução automatizada registrada em 10/11/2026 e a revisão de filtragem das legendas.

## Resultado consolidado

- **23 testes Python aprovados**, incluindo a revisão de filtragem das hipóteses iniciais.
- **9 testes Node.js aprovados** para áudio e estado da transcrição.
- Verificações de interface com Playwright concluídas.
- **Zero violações automáticas nos sete estados avaliados pelo axe-core**.
- Validação manual concluída e aprovada pela equipe, incluindo NVDA, TalkBack, teclado físico, contraste, zoom, celular e fala real. Consulte [VALIDACAO_MANUAL.md](VALIDACAO_MANUAL.md).
- Nenhum teste manual em aberto nos critérios de aceitação da versão final.

## Registro automatizado inicial — 10/11/2026

- 10 testes Python aprovados: página/status, isolamento da chave, origem/host, configuração ausente, PCM inválido, finalização, desconexão e timeout.
- 9 testes Node.js aprovados: limites e formato PCM, contagem de amostras em 16/44,1/48 kHz, snapshots repetidos, revisões, repetições legítimas, preservação de sessões e revisão manual.
- Playwright 1.59.0 com Edge/Chromium em modo headless: preferências persistentes/restauração; demonstração; edição e cancelamento; cópia real para clipboard; download UTF-8; ciclo de teclado nos diálogos; Escape; leitura ampliada; responsividade; texto a 200%; permissões negadas e cancelamento durante a solicitação de permissão.
- Captura sintética usando AudioContext e AudioWorklet reais, com respostas WebSocket interceptadas. Foram observados quadros PCM binários, finalização e duas sessões sem duplicar revisões. Essa execução automatizada utilizou respostas simuladas, sem enviar áudio à STT.ai. A conversa com microfone físico integra a validação manual concluída posteriormente pela equipe.
- Capturas desktop e mobile inspecionadas visualmente.

## Auditoria automatizada

axe-core 4.14.0, regras etiquetadas `wcag2a`, `wcag2aa`, `wcag21aa` e `wcag22aa`. Foram avaliados sete estados: preferências em claro, escuro e alto contraste; demonstração concluída; diálogo de revisão; diálogo de limpeza; cores forçadas do sistema.

**Zero violações automáticas nos sete estados.** No estado de cores forçadas, o axe retornou **um item `incomplete` de color-contrast**. A equipe concluiu a inspeção manual correspondente com aprovação, conforme o registro manual. O JSON preserva a saída original da ferramenta e não é reescrito como se o axe tivesse aprovado esse item automaticamente. O resultado detalhado está em [resultados-acessibilidade.json](resultados-acessibilidade.json).

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

## Validação manual concluída

A equipe confirmou a execução e aprovação dos procedimentos manuais de aceitação. O registro em [VALIDACAO_MANUAL.md](VALIDACAO_MANUAL.md) contempla leitura com NVDA/TalkBack, teclado, contraste e cores forçadas, zoom real de 200%/400%, espaçamento, celular físico, permissões e recuperação de falhas, além de fala real, revisão e exportação.

A conclusão dos testes corresponde ao escopo funcional e de acessibilidade do projeto. A transcrição continua sujeita às condições do áudio, à conexão e ao reconhecimento do fornecedor, características operacionais que não representam pendências de desenvolvimento ou validação.

## Revisão: filtragem das hipóteses iniciais

23 testes Python passaram, incluindo um fluxo WebSocket com Vosk misto, Whisper em português, hipótese Vosk tardia e final Whisper. Os testes cobrem supressão de partial, origem ausente, modo exclusivamente final, silêncio, revisão vazia e fallback Vosk com aviso. A configuração `language: pt` foi mantida.

A melhoria foi verificada com respostas simuladas, sem gastar créditos ou enviar áudio à STT.ai. A equipe também concluiu a conferência com fala real, incluindo a apresentação do texto revisado e o tempo de espera no uso avaliado, com aprovação para o escopo do projeto. `source` é um metadado observado na integração; caso não esteja disponível ou mude, o aplicativo aguarda o resultado final documentado (`is_final`).
