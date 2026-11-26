# Sistema de Treinos Esportivos

API REST em Node.js, Express, Sequelize 6 e MySQL para registrar treinos e acompanhar a carga semanal por atleta, tipo e posição. O indicador de sobrecarga é exclusivamente didático.

## Executar

Requisitos de desenvolvimento: Node.js 20 ou superior, npm e um servidor MySQL em execução.

1. Abra o cliente MySQL com um usuário administrador. Crie o banco e um usuário de desenvolvimento com uma senha de sua escolha. Ajuste o host do usuário se sua instalação exigir.

   ```sql
   CREATE DATABASE treinos_esportivos CHARACTER SET utf8mb4;
   CREATE USER 'treinos'@'localhost' IDENTIFIED BY 'SUA_SENHA_LOCAL';
   GRANT ALL PRIVILEGES ON treinos_esportivos.* TO 'treinos'@'localhost';
   ```

2. Na pasta do projeto, instale as dependências e copie o arquivo de configuração. Preencha `DB_PASSWORD` no `.env` e ajuste os demais valores para seu ambiente.

   ```bash
   npm ci
   cp .env.example .env
   npm run db:criar
   npm run db:popular
   npm start
   ```

3. Abra o Swagger UI em [http://127.0.0.1:3000/docs/](http://127.0.0.1:3000/docs/). Expanda uma operação e use **Try it out** e **Execute**. O contrato também está disponível em `GET /openapi.json`.

O script `db:criar` executa `sequelize.sync()` de forma explícita no ambiente de desenvolvimento. Ele cria as tabelas ausentes a partir dos models. A inicialização da API apenas autentica no banco. A sincronização é bloqueada quando `NODE_ENV=production`. Para evoluir um esquema existente, use migrations versionadas. O script `db:popular` insere os seis atletas e vinte treinos em uma transação e preserva a configuração existente. Use-o em um banco de demonstração novo para reproduzir exatamente os exemplos.

## Endpoints

| Método | Rota | Dados e filtros |
| --- | --- | --- |
| POST | `/jogadores` | `nome`, `posicao` |
| GET | `/jogadores` | `posicao`, `ativo=true\|false` |
| GET | `/jogadores/:id` | ID do jogador |
| PUT | `/jogadores/:id` | Altera `nome`, `posicao` ou ambos |
| PATCH | `/jogadores/:id/desativar` | Marca o atleta como inativo e preserva suas sessões |
| GET | `/configuracao` | `data` opcional. O padrão é a data atual em UTC |
| PUT | `/configuracao` | `cargaMaximaSemanal` e `dataVigencia` opcional |
| POST | `/treinos` | `codigo`, `jogadorId`, `dataTreino`, `tipo`, `duracaoMin`, `intensidade` |
| GET | `/treinos` | `jogadorId`, `tipo`, `posicao`, `inicio`, `fim` |
| GET | `/treinos/jogador/:id` | `tipo`, `posicao`, `inicio`, `fim` |
| DELETE | `/treinos/:codigo` | Código do treino |
| GET | `/relatorios/semanal?data=2026-10-05` | Qualquer data da semana consultada |

Envie corpos JSON. Use posição `G` (goleiro), `Z` (zagueiro), `M` (meio-campista) ou `A` (atacante). O tipo é `F` (físico), `T` (técnico) ou `E` (estratégico). Datas de entrada usam `AAAA-MM-DD` e são interpretadas em UTC. Os dias inicial e final dos filtros são inclusivos. A API retorna `201` para novos jogadores e treinos, `200` para operações concluídas, `400` para entradas inválidas, `404` para registros ou configuração ausentes e `409` para código repetido ou atleta inativo. Para falhas inesperadas, o `500` contém apenas uma mensagem genérica.

## Carga e relatório

A carga de cada sessão é `(duracaoMin / 10) × intensidade × multiplicador`. Os multiplicadores de F, T e E são 1,5, 1,2 e 1,0. A intensidade é inteira de 1 a 10 e a duração é inteira positiva. Para um treino físico de 60 minutos com intensidade 8, a carga calculada manualmente é 72 pontos. Na massa, o treino `DEMO-01` apresenta esse valor.

Uma configuração sem data define o limite padrão. Uma configuração datada substitui o limite a partir da sua vigência e pode ser atualizada com um novo `PUT` para a mesma data. O relatório aplica o limite vigente na segunda-feira da semana consultada. Se o limite ainda estiver ausente para a data, responde com `404`. O risco é sinalizado somente quando a soma semanal excede o limite.

O relatório usa a semana de segunda a domingo. O ranking inclui atletas com pelo menos uma sessão na semana, inclusive atletas posteriormente desativados. Os empates aparecem por ordem de ID e incluem todos os atletas empatados. Em uma semana vazia com limite configurado, os totais são zero, os rankings são listas vazias e as médias aparecem como `null`. A posição exibida é a do cadastro atual.

| Semana | Sessões | Carga total | Maior carga | Atletas em risco |
| --- | ---: | ---: | --- | ---: |
| 05 a 11/10/2026 | 10 | 400 | Ana Costa, 150 | 1 |
| 12 a 18/10/2026 | 10 | 386 | Carla Reis, 173 | 1 |

Na primeira semana, Bruno Lima soma exatamente 100 pontos e fica sem sinalização. Diego Alves, Elisa Rocha e Felipe Dias empatam na menor carga, com 30 pontos cada. A média dos treinos físicos aumenta de 46,50 para 54,00 pontos na segunda semana. Na posição M, a média passa de 30,00 para 57,67.

## Sequelize e async/await

- `src/config/banco.js` configura o dialeto MySQL e lê as credenciais do ambiente.
- `src/models/index.js` declara os três models, validações, índice de data e chave única de treino. `Jogador.hasMany(Treino)` e `Treino.belongsTo(Jogador)` compartilham a FK `jogadorId`.
- `src/services/` usa `create`, `findAll`, `findByPk`, `findOne`, `update`, `upsert` e `destroy` com `await`. As listagens usam `include` e `where`. O registro de treino verifica o estado do jogador em uma transação.
- `src/services/relatorios.js` usa `Op.between`, `count`, `sum` e consultas agrupadas com `fn` e `col`. As consultas compartilham uma transação de leitura para observar o mesmo estado do banco.
- `src/controllers/index.js` aguarda os serviços em `try/catch` e converte as falhas em respostas HTTP JSON.

[Documentação do Sequelize sobre consultas e agregações](https://sequelize.org/docs/v6/core-concepts/model-querying-basics/) · [Documentação do Swagger UI](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)

## Validação

Crie um banco vazio separado com nome terminado em `_teste`, por exemplo `treinos_esportivos_teste`, e dê ao usuário configurado no `.env` acesso a ele. A suíte cria as tabelas nesse banco, popula os registros pela API e apaga a massa que criou ao terminar.

```bash
DB_NAME=treinos_esportivos_teste npm test
```

A pasta `evidencias/` reúne as respostas observadas no Swagger UI, capturas de tela e um índice dos cenários executados.
# treinos-esportivos-att04
