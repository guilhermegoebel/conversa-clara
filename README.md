# Conversa Clara

Aplicativo web de legendas para conversas presenciais em português. A proposta é apoiar pessoas surdas ou com deficiência auditiva que utilizam o português escrito para acompanhar a fala. O aplicativo exibe legendas grandes e permite salvar a transcrição em `.txt`.

O servidor roda no seu computador. **É necessário acesso à internet:** o áudio é enviado à STT.ai. Não é um reconhecedor offline, não traduz Libras e não substitui intérpretes ou outras formas de comunicação escolhidas pela pessoa.

## Funcionalidades

- Iniciar e parar a captura do microfone.
- Exibir legendas durante a conversa, atualizando o texto quando o serviço revisa o reconhecimento.
- Escolher entre três tamanhos de legenda.
- Salvar o texto confirmado e limpar a conversa com confirmação.
- Usar teclado, tela pequena e ampliação do navegador.

Sem cadastro, banco de dados, histórico automático ou instalação de modelos de IA. O áudio não é gravado em arquivos pelo aplicativo. A política de tratamento do áudio enviado ao serviço é de responsabilidade da STT.ai; consulte a [política do fornecedor](https://stt.ai/privacy/).

## Tecnologias e estrutura principal

Python 3.11 ou superior, FastAPI, Uvicorn e WebSocket no servidor; HTML, CSS, JavaScript e AudioWorklet no navegador. Não precisa instalar Node.js para usar o aplicativo.

```text
conversa-clara/
├── app/
│   ├── __init__.py
│   └── main.py             # Página, configuração e conexão com a STT.ai
├── static/
│   ├── index.html          # Estrutura acessível da página
│   ├── styles.css          # Aparência e responsividade
│   ├── app.js              # Microfone, legendas e controles
│   ├── pcm-processor.js    # Conversão do áudio para PCM
│   └── favicon.svg
├── tests/                  # Testes com provedor simulado
├── .env.example
├── .gitignore
├── requirements.txt
├── requirements-dev.txt
└── README.md
```

Fluxo: microfone → navegador (PCM mono, 16 kHz, 16 bits) → servidor Python → STT.ai → legendas na página. A chave fica apenas no servidor. A conexão externa usa `wss://api.stt.ai/v1/stream`; a transcrição é realizada por streaming, sem upload manual de arquivos de áudio.

## Requisitos

- Python 3.11 ou superior.
- Microfone conectado e autorizado no navegador.
- Navegador atualizado com suporte a AudioWorklet e áudio a 16 kHz.
- Conexão com a internet e uma chave própria da STT.ai com acesso ao streaming e créditos disponíveis.

## Obter o projeto

Na página deste repositório, clique em **Code → Download ZIP** e extraia o arquivo. Abra um terminal na pasta extraída que contém `README.md` e `requirements.txt`. O nome dessa pasta pode variar conforme o nome do repositório e da branch.

Quem utiliza Git também pode copiar a URL HTTPS em **Code**, executar `git clone URL_COPIADA` e entrar na pasta criada. Substitua `URL_COPIADA` pela URL real deste repositório.

Cada instalação deve configurar sua própria chave no arquivo `.env`. A aplicação é executada localmente; a página do repositório não é uma versão online do aplicativo.

## Rodar no Windows (PowerShell)

1. Instale [Python](https://www.python.org/downloads/) 3.11 ou superior, com o launcher `py`.
2. Abra o terminal **dentro da pasta extraída ou clonada**, que contém este README e `requirements.txt`.
3. Crie o ambiente e instale as dependências:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

Se já existir um arquivo `.env` configurado, não repita a cópia de `.env.example`; edite o arquivo existente.

4. No arquivo `.env`, preencha a chave, sem os sinais `<` e `>`:

```dotenv
STT_API_KEY=<SUA_CHAVE_STT_AI>
ALLOWED_HOSTS=localhost,127.0.0.1,[::1]
```

Use uma chave válida da sua conta STT.ai, com permissão e créditos para o serviço. Nenhuma chave real está incluída neste projeto. Não adicione a chave ao JavaScript, README ou GitHub.

5. Salve o arquivo e execute:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

6. Abra **http://localhost:8000** em um navegador atualizado. Clique em **Iniciar conversa**, permita o microfone e fale em português. Ao terminar, clique em **Parar conversa**, aguarde a finalização e escolha **Salvar texto**.

Para desligar o servidor, pressione `Ctrl+C` no terminal. Nas próximas vezes, basta executar o comando do passo 5. Reinicie o servidor após editar `.env`. Não é preciso ativar o ambiente nem alterar a política de execução do PowerShell.

## Linux ou macOS

Dentro da pasta do projeto:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
```

Se `.env` já existir, não repita `cp .env.example .env`. Edite `.env` no seu editor, preencha `STT_API_KEY` com sua chave e inicie:

```bash
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Testar no celular sem hospedar

O layout é responsivo, mas o microfone exige um **contexto seguro**. Abrir `http://192.168.x.x:8000` no celular pode mostrar a página, porém não habilita o microfone. `localhost` no celular normalmente significa o próprio celular, e só alcança o computador se houver encaminhamento como o da opção A.

### A. Android por USB, sem certificado

1. Inicie o servidor normalmente no computador.
2. No Android, habilite as opções do desenvolvedor e a depuração USB. Conecte um cabo de dados e autorize o computador no celular.
3. No Chrome do computador, abra `chrome://inspect/#devices` e marque **Discover USB devices**.
4. Entre em **Port forwarding**, adicione a porta do dispositivo `8000` apontando para `localhost:8000` e marque **Enable port forwarding**.
5. No Chrome do Android, abra `http://localhost:8000`. Mantenha o cabo conectado e permita o microfone.
6. Ao terminar, desative o encaminhamento e a depuração USB.

Referência: [encaminhamento de portas do Chrome](https://developer.chrome.com/docs/devtools/remote-debugging/local-server?hl=pt-br).

### B. Android ou iPhone pelo Wi-Fi, com HTTPS local

Use uma rede privada de confiança. Esta configuração não publica o projeto na internet.

1. Instale o [mkcert seguindo seu README oficial](https://github.com/FiloSottile/mkcert#installation). No Windows, use uma das opções de instalação indicadas lá e reabra o terminal.
2. Descubra o IPv4 do computador com `ipconfig`. Nos comandos abaixo, **substitua `192.168.1.10` pelo seu IP real**.
3. Na pasta do projeto, gere certificados locais:

```powershell
mkcert -install
New-Item -ItemType Directory -Force certs
mkcert -key-file certs/local-key.pem -cert-file certs/local.pem localhost 127.0.0.1 192.168.1.10
mkcert -CAROOT
```

4. A última instrução mostra a pasta da autoridade local. Transfira **somente `rootCA.pem`** para o seu celular por um meio privado. Nunca transfira `rootCA-key.pem`. No Android, instale como certificado de CA nas configurações de segurança. No iPhone, instale o perfil e habilite a confiança em Ajustes → Geral → Sobre → Ajustes de Confiança de Certificado. Os nomes variam conforme a versão. Consulte as [instruções do mkcert para celulares](https://github.com/FiloSottile/mkcert#mobile-devices).
5. Acrescente o IP no `.env`:

```dotenv
ALLOWED_HOSTS=localhost,127.0.0.1,[::1],192.168.1.10
```

6. Pare o servidor anterior e inicie:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --ssl-keyfile certs/local-key.pem --ssl-certfile certs/local.pem
```

7. Se o Windows perguntar, permita acesso do Python **apenas na rede privada**. No celular conectado ao mesmo Wi-Fi, abra `https://192.168.1.10:8000`. O certificado deve ser reconhecido sem aviso. Se o IP mudar, gere outro certificado e ajuste `.env`.
8. Ao terminar, desligue o servidor. Remova do celular a autoridade de teste se não for mais usá-la.

Este MVP não possui autenticação de usuários. Quem alcançar o servidor na rede permitida pode iniciar transcrições usando seus créditos. Use uma sessão por vez e não encaminhe a porta do roteador para a internet.

## Teste funcional e de acessibilidade

1. Avise os participantes sobre o envio de áudio e obtenha concordância.
2. Inicie e diga: “Olá, esta é uma conversa de teste. Vamos nos encontrar amanhã às dez horas.”
3. Observe os trechos provisórios e confirmados; compare nomes, horários e números com o que foi falado.
4. Pare durante uma frase. Confirme que o indicador do microfone desliga e que a última legenda chega ou que aparece uma mensagem de falha.
5. Salve o `.txt` e abra-o para conferir os acentos. Inicie novamente: o texto anterior deve continuar na página.
6. Teste limpar/cancelar e limpar/confirmar. Limpar não deve acontecer sem confirmação.
7. Use apenas `Tab`, `Shift+Tab`, `Enter` e setas. Verifique foco visível, seleção do tamanho e acesso à área rolável.
8. Use zoom de 200%, uma tela de 320–390 px e um celular real. Confira se os controles permanecem acessíveis e se não há rolagem horizontal.
9. Teste com NVDA ou VoiceOver: estados e frases confirmadas devem ser anunciados, sem repetir cada alteração provisória.
10. Negue o microfone e teste uma interrupção de rede. A interface deve explicar o problema sem apagar as frases confirmadas.

A interface usa HTML semântico, nomes acessíveis, estados em texto, foco visível, controles grandes e contraste alto. Isso não representa certificação de conformidade WCAG nem substitui avaliação com usuários.

### Testes automatizados, sem consumir API

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest -q
```

Se tiver Node.js 18 ou superior, execute também os testes de conversão de áudio e de atualização das legendas:

```powershell
node --test tests/test_audio.cjs tests/test_transcript.cjs
```

Os testes Python simulam a STT.ai. Eles não comprovam que a chave tem acesso ao streaming nem avaliam a qualidade do reconhecimento real.

## Limitações e problemas comuns

| Situação | Como resolver |
| --- | --- |
| Configuração necessária | Preencha `.env` e reinicie o servidor. A presença da chave não comprova sua validade. |
| A chave não foi aceita ou acesso recusado | Confira a chave, a conta e a disponibilidade de streaming no painel STT.ai. |
| Sem créditos ou limite atingido | Confira o plano do fornecedor e aguarde quando necessário. Não há promessa de uso ilimitado ou gratuito. |
| Microfone bloqueado | Permita o microfone nas configurações do navegador e do sistema. Use localhost ou HTTPS confiável. |
| Sem legendas ou falhas frequentes | Confira a internet, o microfone e o serviço externo; reduza ruído e fale uma pessoa por vez. |
| Página inacessível pelo Wi-Fi | Confira IP, porta, firewall, ALLOWED_HOSTS, certificado e se ambos os dispositivos estão na mesma rede. |
| “Invalid host header” | Acrescente o IP usado em ALLOWED_HOSTS e reinicie. Não use `*` para contornar a proteção. |
| Porta 8000 ocupada | Pare o outro servidor ou escolha outra porta e ajuste os endereços e encaminhamentos. |

As respostas do serviço representam o texto acumulado da sessão. A aplicação substitui a versão anterior, em vez de acrescentá-la novamente; ao iniciar outra conversa, mantém o texto das sessões anteriores. Versões iniciais podem conter palavras em outro idioma antes das correções, mesmo com português configurado.

O processamento tem atraso variável, depende da conexão e do fornecedor e pode errar palavras ou gerar texto incorreto. Não há identificação de falantes. O áudio deve ser mono e o navegador precisa aceitar um contexto de áudio a 16 kHz. A captura encerra ao sair da página, mudar de aplicativo ou ocultar a aba; o texto confirmado permanece enquanto a página estiver aberta. Sessões têm limite de 30 minutos no servidor e podem terminar antes por inatividade do serviço. Você pode iniciar novamente sem apagar o texto.

## Referências técnicas

- [Protocolo e autenticação STT.ai](https://stt.ai/api/).
- [FastAPI e WebSockets](https://fastapi.tiangolo.com/advanced/websockets/).
- [Áudio e contexto seguro no navegador](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).
