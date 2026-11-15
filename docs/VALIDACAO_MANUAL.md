# Registro de validação manual da versão final

## Conclusão e origem do registro

**Resultado: aprovado.** A equipe concluiu os testes manuais de aceitação da versão final do Conversa Clara, sem pendências nesse escopo.

Este registro foi consolidado em **15/11/2026**, com base na confirmação do responsável pelo projeto de que os testes manuais foram realizados e concluídos com sucesso. A data indica a atualização documental, não a data individual de execução de cada teste. Os resultados abaixo consolidam essa confirmação e complementam as evidências automatizadas existentes.

## Verificações aprovadas

| ID | Área avaliada | Procedimento de aceitação | Resultado |
| --- | --- | --- | --- |
| VM01 | Teclado físico | Percorrer os controles com Tab/Shift+Tab, usar o link de salto, ativar seleções e botões e acessar a área de leitura | Aprovado |
| VM02 | Foco e diálogos | Verificar foco inicial e visível, ciclo de Tab, Escape, cancelamento e retorno do foco nos diálogos de revisão e limpeza | Aprovado |
| VM03 | NVDA no Windows | Conferir nomes, estados e ordem de leitura, avisos das legendas e opção de desativar avisos | Aprovado |
| VM04 | TalkBack no Android | Conferir identificação e operação dos controles, leitura das legendas e estados na interface móvel | Aprovado |
| VM05 | Contraste | Examinar os temas claro, escuro e alto contraste, incluindo cores forçadas do sistema e o item de contraste indicado pelo axe para julgamento humano | Aprovado |
| VM06 | Zoom e espaçamento | Verificar zoom real de 200% e 400% e substituição de espaçamentos de texto, sem perda dos controles ou sobreposição de conteúdo | Aprovado |
| VM07 | Celular físico | Verificar responsividade, orientação retrato/paisagem, leitura e operação em dispositivo móvel | Aprovado |
| VM08 | Acompanhamento das legendas | Ler trechos anteriores, desligar a rolagem automática, voltar à última legenda e usar leitura ampliada | Aprovado |
| VM09 | Falhas e permissões | Negar o microfone, cancelar a solicitação e interromper a rede, conferindo mensagem, liberação da captura e preservação do texto | Aprovado |
| VM10 | Fala e microfone reais | Conferir transcrição em português, apresentação das revisões, tempo de espera, nomes, horários, números e repetições | Aprovado |
| VM11 | Revisão e exportação | Revisar o texto após parar, copiar, salvar TXT e conferir conteúdo e acentos | Aprovado |

Os procedimentos detalhados para reprodução constam em [ACESSIBILIDADE.md](ACESSIBILIDADE.md). A rastreabilidade dos requisitos está em [REQUISITOS.md](REQUISITOS.md).

## Relação com a auditoria automatizada

O [relatório original do axe-core](resultados-acessibilidade.json) registra zero violações automáticas nos sete estados avaliados e um item `incomplete` de contraste no estado de cores forçadas. A aprovação de VM05 conclui a avaliação humana desse item. O registro automático permanece íntegro para distinguir o resultado da ferramenta do julgamento manual.

## Escopo da aprovação

A aprovação cobre os critérios funcionais e de acessibilidade definidos para a versão final. O registro não atribui métricas de precisão, tempos numéricos de resposta, quantidade de participantes ou certificação externa. A implementação e a validação concluídas atendem aos requisitos de software da modalidade Desenvolvimento ou Adaptação de Software Acessível da disciplina de Tecnologias Assistivas.
