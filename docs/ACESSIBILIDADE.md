# Matriz de acessibilidade

Referência: [WCAG 2.2 / guia rápido W3C](https://www.w3.org/WAI/WCAG22/quickref/) e [padrão de diálogos WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). O alvo é AA nos critérios aplicáveis à interface. Uma aplicação de legendas automáticas não garante, por si só, conformidade com 1.2.4 nem precisão suficiente para qualquer contexto.

| Critérios WCAG | Implementação | Verificação / limite |
| --- | --- | --- |
| 1.3.1, 1.3.2 | HTML semântico, idioma pt-BR, regiões e ordem de leitura linear | axe-core; revisão estrutural |
| 1.4.1 | Estados e alertas com texto, além de cor | revisão da interface |
| 1.4.3, 1.4.11 | Temas claro/escuro/alto contraste, bordas e foco distinguíveis | axe nos três temas; tabela de contraste em VALIDACAO.md |
| 1.4.4, 1.4.10 | Unidades relativas, quebra de texto, layout flexível | 320–1280 px e texto a 200% automatizados; zoom real 400% pendente |
| 1.4.12 | Espaçamento configurável e caixas sem corte horizontal | inspeção do CSS; teste de override de espaçamento recomendado abaixo |
| 2.1.1, 2.1.2 | Controles nativos, diálogos com ciclo de Tab, Escape e retorno do foco | caminhos principais automatizados; teclado físico ainda recomendado |
| 2.4.1 | Link “Ir para a conversa” | inspeção e teste manual abaixo |
| 2.4.3, 2.4.7, 2.4.11 | Sem tabindex positivo, foco visível com contorno, sem cabeçalhos fixos cobrindo foco | teste de diálogos e revisão visual |
| 2.5.8 | Botões e seleções com altura mínima de 48 px, labels de checkbox amplas | CSS e inspeção visual; axe-core |
| 3.3.1, 3.3.2 | Erros em texto, rótulos associados, instruções de recuperação | teste de permissão negada e configuração ausente |
| 4.1.2 | Nomes acessíveis, aria-pressed, aria-disabled, labels de diálogo | axe-core |
| 4.1.3 | status/alert e anúncios agrupados, com opção de desligar | estrutura e testes da interface; NVDA/TalkBack pendentes |

## Roteiro manual de aceitação

Registre navegador, sistema, tecnologia assistiva, data, tarefa, dificuldade e evidência. Este roteiro não é um registro de teste realizado.

1. Sem mouse, percorra a página inteira com Tab/Shift+Tab e use o link de salto. Ative preferências, cada select, checkbox, demonstração e leitura ampliada. Confirme que não há função exclusiva do mouse.
2. Nos diálogos, confirme foco inicial, ciclo de Tab, Escape, cancelamento sem perda de texto e retorno do foco. Teste revisão com texto vazio e muito longo.
3. Com NVDA no Windows ou TalkBack no Android, confira título, idioma, nomes e estados. Ative a demonstração: parciais não devem ser anunciados e revisões não devem causar leitura contínua de todo o histórico. Desligue anúncios e confirme a mudança.
4. Experimente os três temas, inclusive com luz ambiente diferente. Ative alto contraste do sistema operacional. Examine o item incompleto de contraste identificado pelo axe nesse modo.
5. Teste zoom real de 200% e 400%, orientação retrato/paisagem e celular físico. Aumente espaçamento de linha para 1,5, parágrafos para 2 vezes o tamanho da fonte, letras para 0,12 em e palavras para 0,16 em usando estilos do navegador. Nada deve desaparecer ou se sobrepor.
6. Leia trechos anteriores durante a captura. A interface não deve puxar a rolagem ao fim. Desative acompanhamento e use “Ir à última legenda” para retornar.
7. Negue o microfone, cancele uma permissão pendente e interrompa a rede. Confira mensagem, liberação da captura e preservação do texto. O cancelamento não deve iniciar captura tardia.
8. Com consentimento, faça uma conversa real curta. Compare números, horários, nomes e repetições. Corrija um erro, copie e salve; confira o TXT.

## Pendências de avaliação

Não foram realizados testes com usuários, NVDA/TalkBack, microfone físico nesta revisão ou celulares físicos. A documentação e os recursos implementados permitem essa avaliação, mas não substituem a evidência de uso real. Não há declaração de conformidade integral WCAG/eMAG.
