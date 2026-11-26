# Evidências do Swagger UI

As 18 requisições abaixo foram executadas no Swagger UI contra a API local. Os corpos completos estão em [requisicoes-respostas.json](requisicoes-respostas.json). Nas capturas, a seção **Server response** mostra a resposta recebida.

O MySQL 9.6.0 foi usado para os cenários de sucesso e validação. No cenário 500, uma segunda instância da API tentou consultar uma porta local sem MySQL e retornou apenas a mensagem genérica.

## Requisições observadas

| Cenário | Requisição | HTTP | Captura |
| --- | --- | ---: | --- |
| Seis atletas nas quatro posições | `GET /jogadores` | 200 | — |
| Limite semanal de 100 pontos | `GET /configuracao` | 200 | — |
| Primeira semana com atleta acima do limite, empate no mínimo e atleta no limite | `GET /relatorios/semanal?data=2026-10-05` | 200 | [Abrir](01-relatorio-semana-05.png) |
| Segunda semana com mudança na maior carga e nas médias | `GET /relatorios/semanal?data=2026-10-12` | 200 | [Abrir](02-relatorio-semana-12.png) |
| Semana sem treinos | `GET /relatorios/semanal?data=2026-10-19` | 200 | — |
| Cadastro de atleta para os cenários de escrita | `POST /jogadores` | 201 | — |
| Criação do treino físico com carga calculada de 72 pontos | `POST /treinos` | 201 | [Abrir](03-treino-carga-72.png) |
| Código duplicado | `POST /treinos` | 409 | [Abrir](04-codigo-duplicado.png) |
| Intensidade acima de 10 | `POST /treinos` | 400 | [Abrir](05-intensidade-invalida.png) |
| Duração igual a zero | `POST /treinos` | 400 | [Abrir](06-duracao-invalida.png) |
| Jogador inexistente | `POST /treinos` | 404 | [Abrir](07-jogador-inexistente.png) |
| Desativação do atleta com treino registrado | `PATCH /jogadores/7/desativar` | 200 | — |
| Novo treino para jogador inativo | `POST /treinos` | 409 | [Abrir](08-jogador-inativo.png) |
| Histórico preservado após desativação | `GET /treinos/jogador/7` | 200 | — |
| Filtro por atleta, data, tipo e posição | `GET /treinos?jogadorId=1&tipo=F&posicao=G&inicio=2026-10-05&fim=2026-10-11` | 200 | — |
| Exclusão por código | `DELETE /treinos/SWAGGER-CARGA` | 200 | — |
| Exclusão de código ausente | `DELETE /treinos/SWAGGER-CARGA` | 404 | — |
| Banco indisponível com resposta genérica | `GET /jogadores` | 500 | [Abrir](09-erro-interno.png) |

## Resultados conferidos

- Treino físico de 60 minutos com intensidade 8: `(60 / 10) × 8 × 1,5 = 72` pontos. A API retornou `carga: 72` com HTTP 201.
- Semana de 5 a 11 de outubro: 10 treinos, 400 pontos e uma atleta em risco. Ana Costa atingiu 150 pontos. Bruno Lima fez exatamente 100 e ficou sem sinalização.
- Semana de 12 a 18 de outubro: 10 treinos, 386 pontos e uma atleta em risco. Carla Reis atingiu 173 pontos. A média dos treinos físicos subiu de 46,50 para 54,00 pontos, e a média da posição M subiu de 30,00 para 57,67.
- O cenário de falha de banco retornou HTTP 500 com o JSON `{"erro":"Erro interno do servidor."}`.
