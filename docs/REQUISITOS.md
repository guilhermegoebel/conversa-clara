# Requisitos do Conversa Clara

## Objetivo e público

Apoiar o acompanhamento de conversas presenciais em português escrito, sobretudo por pessoas surdas ou com deficiência auditiva que escolham esse recurso. A personalização também atende necessidades de baixa visão e de leitura. A solução não traduz Libras, não substitui intérpretes e não presume que todas as pessoas surdas prefiram português escrito.

## Escopo

Aplicação web local com transcrição externa, interface acessível e configurações individuais de leitura. Não inclui hospedagem pública, contas, histórico automático, identificação de falantes ou avaliação clínica. A adaptação é orientada aos critérios aplicáveis da WCAG 2.2 nível AA; não é uma certificação integral.

| ID | Requisito | Critério de aceitação | Implementação / evidência |
| --- | --- | --- | --- |
| RF01 | Iniciar e parar captura em português | Solicitar permissão apenas por ação explícita; desligar tracks ao parar/cancelar/ocultar página | app.js; teste de captura sintética e permissão |
| RF02 | Atualizar legendas sem acumular revisões | Oito snapshots iguais produzem um trecho; revisões menores substituem a anterior | transcript.js; test_transcript.cjs |
| RF03 | Preservar sessões e repetições reais | Duas sessões iguais permanecem distintas; repetições dentro da fala não são removidas | testes de estado e navegador |
| RF04 | Personalizar leitura | Três temas, quatro tamanhos, dois espaçamentos; restaurar padrões | settings e testes de persistência |
| RF05 | Controlar acompanhamento | Rolagem opcional, leitura de histórico sem puxar ao fim, ação explícita para voltar à última legenda | app.js; roteiro manual |
| RF06 | Revisar e exportar | Editar após parar; copiar e baixar TXT UTF-8 sem parciais | diálogo de revisão; teste de arquivo e clipboard |
| RF07 | Limpar com confirmação | Cancelar/Escape preservam texto; confirmar limpa e reposiciona foco | diálogos; teste de teclado |
| RF08 | Experimentar sem API | Exemplo identificado sem captura/requisição externa; sem mistura com conversa real | modo demonstração; teste de navegador |
| RF09 | Informar estado e falhas | Mensagens textuais para configuração, permissão, conexão, gravação e encerramento | status/alert; testes backend e UI |
| RNF01 | Operação completa por teclado | Ordem natural, foco visível, ciclo nos diálogos e saída por Escape | teste de teclado + roteiro manual |
| RNF02 | Suporte semântico a leitores de tela | Idioma, regiões, rótulos, estados e anúncios controlados; nenhum parcial anunciado | HTML e teste axe; leitura real pendente |
| RNF03 | Responsividade | Sem rolagem horizontal entre 320 e 1280 px; ampliação de texto | browser_checks.py; revisão visual |
| RNF04 | Privacidade por padrão | Chave só no servidor; sem persistência da conversa; localStorage só de preferências | revisão técnica e teste do endpoint de status |
| RNF05 | Compatibilidade de áudio | PCM mono de 16 bits little-endian a 16 kHz, partindo de taxa nativa | testes 16/44,1/48 kHz |
| RNF06 | Robustez | Liberar recursos após falha/cancelamento; preservar texto; limitar fila e duração | servidor e testes de fluxo |

## Critérios que dependem de avaliação humana

Conforto e adequação dos contrastes; inteligibilidade, atraso e precisão da fala; uso efetivo com NVDA/TalkBack; nomes próprios e números; compreensão das mensagens; operação em celulares físicos. Registre resultados reais antes de declarar esses critérios atendidos. O roteiro está em ACESSIBILIDADE.md.
