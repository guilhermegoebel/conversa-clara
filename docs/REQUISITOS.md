# Requisitos do Conversa Clara

## Estado da entrega

Projeto final concluído na modalidade **Desenvolvimento ou Adaptação de Software Acessível**, da disciplina de Tecnologias Assistivas. Os requisitos de software e documentação deste escopo estão implementados e aprovados. A equipe confirmou a conclusão dos testes manuais, complementando os testes automatizados registrados.

A entrega cobre suporte a leitores de tela por semântica HTML e ARIA, navegabilidade completa por teclado, contraste configurável e documentação de requisitos, arquitetura e acessibilidade. A matriz abaixo registra a aceitação da versão final.

## Objetivo e público

Apoiar o acompanhamento de conversas presenciais em português escrito, sobretudo por pessoas surdas ou com deficiência auditiva que escolham esse recurso. A personalização também atende necessidades de baixa visão e de leitura. A solução não traduz Libras, não substitui intérpretes e não presume que todas as pessoas surdas prefiram português escrito.

## Escopo

Aplicação web local com transcrição externa, interface acessível e configurações individuais de leitura. Não inclui hospedagem pública, contas, histórico automático, identificação de falantes ou avaliação clínica. A adaptação é orientada aos critérios aplicáveis da WCAG 2.2 nível AA; não é uma certificação integral.

| ID | Requisito | Critério de aceitação | Implementação / evidência | Estado |
| --- | --- | --- | --- | --- |
| RF01 | Iniciar e parar captura em português | Solicitar permissão apenas por ação explícita; desligar tracks ao parar/cancelar/ocultar página | app.js; teste de captura sintética e permissão | Atendido |
| RF02 | Atualizar legendas sem acumular revisões | Oito snapshots iguais produzem um trecho; revisões menores substituem a anterior | transcript.js; test_transcript.cjs | Atendido |
| RF03 | Preservar sessões e repetições reais | Duas sessões iguais permanecem distintas; repetições dentro da fala não são removidas | testes de estado e navegador | Atendido |
| RF04 | Personalizar leitura | Três temas, quatro tamanhos, dois espaçamentos; restaurar padrões | settings e testes de persistência | Atendido |
| RF05 | Controlar acompanhamento | Rolagem opcional, leitura de histórico sem puxar ao fim, ação explícita para voltar à última legenda | app.js; validação manual aprovada | Atendido |
| RF06 | Revisar e exportar | Editar após parar; copiar e baixar TXT UTF-8 sem parciais | diálogo de revisão; teste de arquivo e clipboard | Atendido |
| RF07 | Limpar com confirmação | Cancelar/Escape preservam texto; confirmar limpa e reposiciona foco | diálogos; teste de teclado | Atendido |
| RF08 | Experimentar sem API | Exemplo identificado sem captura/requisição externa; sem mistura com conversa real | modo demonstração; teste de navegador | Atendido |
| RF09 | Informar estado e falhas | Mensagens textuais para configuração, permissão, conexão, gravação e encerramento | status/alert; testes backend e UI | Atendido |
| RNF01 | Operação completa por teclado | Ordem natural, foco visível, ciclo nos diálogos e saída por Escape | testes automatizados e validação com teclado físico aprovada | Atendido |
| RNF02 | Suporte semântico a leitores de tela | Idioma, regiões, rótulos, estados e anúncios controlados; nenhum parcial anunciado | HTML, axe-core e validação manual aprovada com NVDA/TalkBack | Atendido |
| RNF03 | Responsividade | Sem rolagem horizontal entre 320 e 1280 px; ampliação de texto | browser_checks.py; validação manual de zoom e celular aprovada | Atendido |
| RNF04 | Privacidade por padrão | Chave só no servidor; sem persistência da conversa; localStorage só de preferências | revisão técnica e teste do endpoint de status | Atendido |
| RNF05 | Compatibilidade de áudio | PCM mono de 16 bits little-endian a 16 kHz, partindo de taxa nativa | testes 16/44,1/48 kHz | Atendido |
| RNF06 | Robustez | Liberar recursos após falha/cancelamento; preservar texto; limitar fila e duração | servidor e testes de fluxo | Atendido |

## Aceitação manual concluída

A equipe aprovou as verificações de leitura com NVDA/TalkBack, teclado físico, contraste, ampliação, espaçamento, operação em celular, mensagens de erro e conversa real com microfone. A conferência da transcrição incluiu nomes, números, horários e repetições, além de revisão e exportação do texto.

O [registro de validação manual](VALIDACAO_MANUAL.md) consolida a confirmação da equipe. A [matriz de acessibilidade](ACESSIBILIDADE.md) relaciona os critérios à implementação, e o [relatório de validação](VALIDACAO.md) reúne os resultados automatizados e manuais. Não há testes manuais em aberto nos critérios de aceitação da versão final.
