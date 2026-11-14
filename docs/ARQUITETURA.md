# Arquitetura

## Componentes

```text
Microfone → getUserMedia → AudioContext na taxa nativa
          → AudioWorklet (PCM mono / 16 kHz / 16 bits)
          → WebSocket local /ws/transcribe
          → FastAPI → STT.ai (conexão WSS autenticada)
          → snapshots e parciais → estado de transcrição → interface
```

- `app/main.py`: serve a página e os arquivos estáticos, informa apenas se uma chave foi configurada, valida origem/host, autentica a conexão externa, repassa áudio e resultados e trata falhas.
- `static/pcm-processor.js`: reamostra continuamente por média ponderada. A fase fracionária é mantida entre blocos para taxas como 44,1 kHz. Converte para Int16 little-endian, agrupa até 4096 amostras e esvazia o último buffer ao parar. É uma conversão leve para voz, não um reamostrador de alta fidelidade.
- `static/transcript.js`: modelo independente do DOM. Cada sessão tem um prefixo de conversas anteriores e um snapshot revisável. Revisar manualmente substitui o texto preservado; uma nova sessão parte dessa revisão.
- `static/app.js`: estados da interação, liberação do microfone, renderização com `textContent`, anúncios, preferências, demonstração e exportação.
- `static/index.html` / `styles.css`: estrutura semântica, diálogos nativos e temas por variáveis CSS.

## Estados

`idle → connecting → listening → stopping → idle`. Cancelar a conexão retorna a `idle`; falha ou ocultação da aba libera os recursos e retorna a `idle`. Durante `stopping`, o botão mantém o foco, mas fica indisponível por `aria-disabled` e pela verificação de estado. A demonstração reutiliza o fluxo de apresentação sem abrir microfone ou WebSocket.

## Contratos locais

- `GET /`: HTML.
- `GET /api/status`: `{ "configured": true | false }`. Não testa validade nem saldo da chave.
- `WS /ws/transcribe`: navegador envia blocos binários PCM ou `{"action":"stop"}`. Recebe `ready`, `recognizing` (aguardando revisão), `transcript` (snapshot selecionado, sem parcial), `warning`, `done` e `error` (mensagem segura para interface).

`text` é um snapshot revisável da sessão, não um novo parágrafo a cada mensagem. Não há deduplicação por palavras: ela apagaria repetições legítimas. `partial` é provisório e não entra na exportação.

## Privacidade e limites

O `.env` fica no servidor. Preferências ficam em `localStorage` sob `conversa-clara.preferences`. Texto e áudio não são gravados automaticamente. Copiar envia texto para a área de transferência; salvar solicita um download local. O tratamento posterior do áudio no fornecedor depende da política STT.ai.

Host e origem são validados. Quadros inválidos ou grandes são recusados. A fila do navegador é limitada e as tarefas de relay são canceladas na desconexão. Há limite de 30 minutos de sessão, tempo limite para resposta/finalização e aviso na interface ao chegar a 29 minutos. Conteúdo recebido é inserido como texto, não HTML. As respostas HTTP recebem `no-store`, `nosniff`, restrição de incorporação por iframe e política de microfone da mesma origem.

O aviso de saída usa `beforeunload`, quando suportado, mas não é garantia de recuperação em celulares ou encerramento forçado. Não há autenticação de usuários: execute em localhost ou rede privada controlada. A aplicação não está pronta para exposição pública sem autenticação, TLS e controle de consumo adicionais.

## Decisões de acessibilidade

Os temas reutilizam tokens de cor; o espaçamento e o tamanho são atributos do documento. O texto visual não é `aria-live`: uma região separada anuncia acréscimos ou correções agrupadas em intervalos de 1,5 s, evitando reler o histórico inteiro em cada snapshot. O usuário pode desligar os anúncios. Não existe síntese de voz própria, para não competir com leitores de tela.

Sem framework de frontend ou build obrigatório. Node.js e axe-core são somente ferramentas opcionais de desenvolvimento; a execução continua dependendo apenas dos requisitos Python existentes.

## Seleção do estágio de reconhecimento

`app/transcription.py` filtra os eventos antes de enviá-los ao navegador. No modo padrão `reviewed`, aceita `text` de `source: whisper` e resultados com `is_final: true`; nunca repassa `partial`. Eventos intermediários sem origem reconhecida são retidos até a resposta final. `STT_DISPLAY_MODE=final` retém também as revisões intermediárias Whisper.

Um final Vosk não substitui uma revisão Whisper já exibida; emite aviso sobre a ausência de revisão final. Se não houve revisão, o final Vosk é exibido com aviso. Uma revisão Whisper final vazia pode limpar uma hipótese incorreta. Isso é seleção por metadados do provedor, não detecção automática de idioma.
