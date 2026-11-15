# Matriz de acessibilidade

Referência: [WCAG 2.2 / guia rápido W3C](https://www.w3.org/WAI/WCAG22/quickref/) e [padrão de diálogos WAI-ARIA](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). O alvo é AA nos critérios aplicáveis à interface. Uma aplicação de legendas automáticas não garante, por si só, conformidade com 1.2.4 nem precisão suficiente para qualquer contexto.

| Critérios WCAG | Implementação | Verificação concluída |
| --- | --- | --- |
| 1.3.1, 1.3.2 | HTML semântico, idioma pt-BR, regiões e ordem de leitura linear | axe-core; revisão estrutural |
| 1.4.1 | Estados e alertas com texto, além de cor | revisão da interface |
| 1.4.3, 1.4.11 | Temas claro/escuro/alto contraste, bordas e foco distinguíveis | axe nos três temas, tabela de contraste em VALIDACAO.md e inspeção manual de cores forçadas aprovada |
| 1.4.4, 1.4.10 | Unidades relativas, quebra de texto, layout flexível | 320–1280 px e texto a 200% automatizados; zoom real de 200%/400% e celular aprovados manualmente |
| 1.4.12 | Espaçamento configurável e caixas sem corte horizontal | inspeção do CSS e teste manual de substituição de espaçamento aprovado |
| 2.1.1, 2.1.2 | Controles nativos, diálogos com ciclo de Tab, Escape e retorno do foco | caminhos principais automatizados e navegação com teclado físico aprovada |
| 2.4.1 | Link “Ir para a conversa” | inspeção e uso do link de salto aprovados manualmente |
| 2.4.3, 2.4.7, 2.4.11 | Sem tabindex positivo, foco visível com contorno, sem cabeçalhos fixos cobrindo foco | teste de diálogos e revisão visual |
| 2.5.8 | Botões e seleções com altura mínima de 48 px, labels de checkbox amplas | CSS e inspeção visual; axe-core |
| 3.3.1, 3.3.2 | Erros em texto, rótulos associados, instruções de recuperação | teste de permissão negada e configuração ausente |
| 4.1.2 | Nomes acessíveis, aria-pressed, aria-disabled, labels de diálogo | axe-core |
| 4.1.3 | status/alert e anúncios agrupados, com opção de desligar | estrutura, testes da interface e validação manual com NVDA/TalkBack aprovada |

## Procedimento de reprodução da validação manual

A equipe concluiu e aprovou a avaliação manual da versão final. O [registro consolidado](VALIDACAO_MANUAL.md) apresenta os resultados. Os passos abaixo ficam disponíveis para reproduzir os testes e verificar futuras alterações, sem representar pendências da entrega.

1. Sem mouse, percorra a página inteira com Tab/Shift+Tab e use o link de salto. Ative preferências, cada select, checkbox, demonstração e leitura ampliada. Confirme que não há função exclusiva do mouse.
2. Nos diálogos, confirme foco inicial, ciclo de Tab, Escape, cancelamento sem perda de texto e retorno do foco. Teste revisão com texto vazio e muito longo.
3. Com NVDA no Windows ou TalkBack no Android, confira título, idioma, nomes e estados. Ative a demonstração: parciais não devem ser anunciados e revisões não devem causar leitura contínua de todo o histórico. Desligue anúncios e confirme a mudança.
4. Experimente os três temas, inclusive com luz ambiente diferente. Ative alto contraste do sistema operacional. Confira também o contraste nesse modo, cuja inspeção manual complementa o item classificado como `incomplete` pelo axe.
5. Teste zoom real de 200% e 400%, orientação retrato/paisagem e celular físico. Aumente espaçamento de linha para 1,5, parágrafos para 2 vezes o tamanho da fonte, letras para 0,12 em e palavras para 0,16 em usando estilos do navegador. Nada deve desaparecer ou se sobrepor.
6. Leia trechos anteriores durante a captura. A interface não deve puxar a rolagem ao fim. Desative acompanhamento e use “Ir à última legenda” para retornar.
7. Negue o microfone, cancele uma permissão pendente e interrompa a rede. Confira mensagem, liberação da captura e preservação do texto. O cancelamento não deve iniciar captura tardia.
8. Com consentimento, faça uma conversa real curta. Compare números, horários, nomes e repetições. Corrija um erro, copie e salve; confira o TXT.

## Resultado da avaliação final

Os critérios de aceitação de acessibilidade definidos para a versão final foram aprovados pela equipe, com testes automatizados e avaliação manual. A verificação manual abrangeu leitores de tela, navegação por teclado, contraste, ampliação, espaçamento, uso em celular e interação com fala real.

A inspeção humana do contraste em cores forçadas foi concluída com aprovação. O JSON do axe permanece como registro original da ferramenta: seu campo `incomplete` identifica a necessidade de julgamento humano naquela execução, já atendida no registro manual.

A validação refere-se ao escopo e aos critérios relacionados nesta matriz. Ela não constitui certificação externa de conformidade integral WCAG/eMAG nem garantia de precisão do serviço de reconhecimento em qualquer ambiente.
