# Mini Tarefas AWS

Aplicacao simples para aprender o fluxo basico de uma aplicacao serverless na AWS:

- Frontend estatico em S3
- API HTTP com API Gateway
- Backend com AWS Lambda
- Banco NoSQL com DynamoDB
- Logs no CloudWatch
- Infraestrutura com AWS SAM

## Como testar localmente

Abra o arquivo `frontend/index.html` no navegador. Sem configurar API, o app usa `localStorage` automaticamente para voce testar a tela.

## Estrutura

```text
frontend/
  index.html
  styles.css
  app.js
backend/
  tasks.js
template.yaml
```

## Como publicar a API na AWS

Pre-requisitos:

- Conta AWS
- AWS CLI configurado com `aws configure`
- AWS SAM CLI instalado
- Node.js 20+

Com tudo configurado, rode:

```bash
sam build
sam deploy --guided
```

No final do deploy, o SAM mostra a URL da API em `ApiUrl`.

## Como conectar o frontend na API

Abra `frontend/app.js` e troque:

```js
const API_BASE_URL = "";
```

pela URL gerada no deploy, por exemplo:

```js
const API_BASE_URL = "https://abc123.execute-api.us-east-1.amazonaws.com";
```

Depois envie os arquivos da pasta `frontend` para um bucket S3 com hospedagem de site estatico.

## O que voce aprende com esse projeto

1. Criar uma tabela DynamoDB.
2. Dar permissao para Lambda acessar a tabela.
3. Expor endpoints HTTP via API Gateway.
4. Fazer deploy com infraestrutura como codigo.
5. Hospedar uma pagina estatica em S3.
