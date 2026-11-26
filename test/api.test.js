const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const app = require('../src/app');
const { sequelize, Jogador, Treino, Configuracao } = require('../src/models');
const massa = require('../scripts/massa');

test('API REST em uma base MySQL de teste vazia', async (t) => {
  try {
    assert.match(sequelize.config.database, /_teste$/, 'Use um banco separado com sufixo _teste.');
    await sequelize.sync();
    assert.deepEqual(await Promise.all([Jogador.count(), Treino.count(), Configuracao.count()]),
      [0, 0, 0], 'Use uma base de teste vazia.');

    const servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const { port } = servidor.address();
    const atletas = [];
    const limites = [];

    async function requisitar(rota, status, method = 'GET', body) {
      const resposta = await fetch(`http://127.0.0.1:${port}${rota}`, {
        method,
        ...(body === undefined ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        }),
      });
      const resultado = await resposta.json();
      assert.equal(resposta.status, status, `${method} ${rota}: ${JSON.stringify(resultado)}`);
      return resultado;
    }

    function payload(treino) {
      const { jogador, ...dados } = treino;
      return { ...dados, jogadorId: atletas[jogador].id };
    }

    try {
      await t.test('publica Swagger UI e o contrato OpenAPI', async () => {
        for (const rota of ['/docs', '/docs/']) {
          const pagina = await fetch(`http://127.0.0.1:${port}${rota}`, { redirect: 'error' });
          assert.equal(pagina.status, 200);
          assert.match(await pagina.text(), /SwaggerUIBundle/);
        }
        const contrato = await requisitar('/openapi.json', 200);
        assert.equal(contrato.openapi, '3.0.3');
        assert.ok(contrato.paths['/relatorios/semanal'].get);
      });

      await t.test('CRUD de jogadores e configuração de limite', async () => {
        await requisitar('/configuracao', 404);
        for (const dados of massa.jogadores) {
          atletas.push(await requisitar('/jogadores', 201, 'POST', dados));
        }
        const encontrados = await requisitar('/jogadores', 200);
        assert.equal(encontrados.length, 6);
        assert.deepEqual(new Set(encontrados.map(({ posicao }) => posicao)), new Set(['G', 'Z', 'M', 'A']));
        assert.equal((await requisitar(`/jogadores/${atletas[0].id}`, 200)).nome, 'Ana Costa');
        assert.equal((await requisitar(`/jogadores/${atletas[0].id}`, 200, 'PUT',
          { nome: 'Ana Costa' })).nome, 'Ana Costa');
        assert.equal((await requisitar('/jogadores?posicao=A&ativo=true', 200)).length, 2);
        await requisitar('/jogadores', 400, 'POST', { nome: 'Inválido', posicao: 'X' });
        await requisitar('/jogadores', 400, 'POST', '{');
        limites.push(await requisitar('/configuracao', 200, 'PUT', massa.limite));
        limites.push(await requisitar('/configuracao', 200, 'PUT', {
          cargaMaximaSemanal: 160, dataVigencia: '2026-10-19',
        }));
        assert.equal((await requisitar('/configuracao?data=2026-10-12', 200)).cargaMaximaSemanal, 100);
        assert.equal((await requisitar('/configuracao?data=2026-10-19', 200)).cargaMaximaSemanal, 160);
      });

      await t.test('registra vinte treinos, calcula a carga e valida as entradas', async () => {
        for (const treino of massa.treinos) {
          const registrado = await requisitar('/treinos', 201, 'POST', payload(treino));
          if (treino.codigo === 'DEMO-01') assert.equal(registrado.carga, (60 / 10) * 8 * 1.5);
        }
        const base = payload(massa.treinos[0]);
        await requisitar('/treinos', 409, 'POST', base);
        await requisitar('/treinos', 400, 'POST', { ...base, codigo: 'INVALIDO-I', intensidade: 11 });
        await requisitar('/treinos', 400, 'POST', { ...base, codigo: 'INVALIDO-D', duracaoMin: 0 });
        await requisitar('/treinos', 400, 'POST', { ...base, codigo: 'INVALIDO-T', tipo: 'X' });
        await requisitar('/treinos', 400, 'POST', { ...base, codigo: 'INVALIDO-DATA', dataTreino: '2026-02-30' });
        await requisitar('/treinos', 404, 'POST', { ...base, codigo: 'AUSENTE', jogadorId: 2147483647 });

        const atletaId = atletas[0].id;
        const desativado = await requisitar(`/jogadores/${atletaId}/desativar`, 200, 'PATCH');
        assert.equal(desativado.ativo, false);
        await requisitar('/treinos', 409, 'POST', { ...base, codigo: 'INATIVO' });
        const historico = await requisitar(`/treinos/jogador/${atletaId}`, 200);
        assert.equal(historico.length, 5);
        assert.equal(historico[0].jogador.ativo, false);

        const filtrados = await requisitar(
          `/treinos?jogadorId=${atletaId}&tipo=F&posicao=G&inicio=2026-10-05&fim=2026-10-11`, 200,
        );
        assert.deepEqual(filtrados.map(({ codigo }) => codigo), ['DEMO-01']);
        await requisitar('/treinos?inicio=2026-10-12&fim=2026-10-11', 400);
      });

      await t.test('compara semanas, limite, empates e semana vazia', async () => {
        const semana1 = await requisitar('/relatorios/semanal?data=2026-10-11', 200);
        const semana2 = await requisitar('/relatorios/semanal?data=2026-10-12', 200);
        assert.deepEqual(semana1.semana, { inicio: '2026-10-05', fim: '2026-10-11' });
        assert.deepEqual(semana2.semana, { inicio: '2026-10-12', fim: '2026-10-18' });
        assert.equal(semana1.totalTreinos, 10);
        assert.equal(semana2.totalTreinos, 10);
        assert.equal(semana1.cargaTotal, 400);
        assert.equal(semana2.cargaTotal, 386);
        assert.equal(semana1.jogadoresEmRisco, 1);
        assert.equal(semana2.jogadoresEmRisco, 1);
        assert.equal(semana1.maiorCargaSemanal[0].nome, 'Ana Costa');
        assert.equal(semana2.maiorCargaSemanal[0].nome, 'Carla Reis');
        assert.equal(semana1.porJogador[1].cargaSemanal, 100);
        assert.equal(semana1.porJogador[1].emRisco, false);
        assert.deepEqual(semana1.menorCargaSemanal.map(({ nome }) => nome),
          ['Diego Alves', 'Elisa Rocha', 'Felipe Dias']);
        assert.deepEqual(semana1.mediaPorTipo.map(({ cargaMedia }) => cargaMedia), [46.5, 38, 33.33]);
        assert.deepEqual(semana2.mediaPorTipo.map(({ cargaMedia }) => cargaMedia), [54, 38, 18.67]);
        assert.deepEqual(semana1.porPosicao.map(({ totalTreinos, cargaMedia }) =>
          [totalTreinos, cargaMedia]), [[3, 50], [3, 43.33], [2, 30], [2, 30]]);
        assert.deepEqual(semana2.porPosicao.map(({ totalTreinos, cargaMedia }) =>
          [totalTreinos, cargaMedia]), [[2, 28], [2, 32], [3, 57.67], [3, 31]]);

        const vazia = await requisitar('/relatorios/semanal?data=2026-10-19', 200);
        assert.equal(vazia.cargaMaximaSemanal, 160);
        assert.equal(vazia.totalTreinos, 0);
        assert.equal(vazia.cargaTotal, 0);
        assert.equal(vazia.jogadoresEmRisco, 0);
        assert.deepEqual(vazia.porJogador, []);
        assert.deepEqual(vazia.maiorCargaSemanal, []);
        assert.deepEqual(vazia.menorCargaSemanal, []);
        assert.ok([...vazia.mediaPorTipo, ...vazia.porPosicao]
          .every(({ cargaMedia, totalTreinos }) => cargaMedia === null && totalTreinos === 0));
        await requisitar('/relatorios/semanal?data=2026-02-30', 400);
      });

      await t.test('exclui por código e retorna 404 nas novas tentativas', async () => {
        const base = payload(massa.treinos[3]);
        await requisitar('/treinos', 201, 'POST', { ...base, codigo: 'EXCLUIR' });
        await requisitar('/treinos/EXCLUIR', 200, 'DELETE');
        await requisitar('/treinos/EXCLUIR', 404, 'DELETE');
      });

      await sequelize.transaction(async (transaction) => {
        const ids = atletas.map(({ id }) => id);
        await Treino.destroy({ where: { jogadorId: ids }, transaction });
        await Jogador.destroy({ where: { id: ids }, transaction });
        await Configuracao.destroy({ where: { id: limites.map(({ id }) => id) }, transaction });
      });
      await sequelize.close();

      await t.test('falha de persistência retorna 500 genérico', async () => {
        assert.deepEqual(await requisitar('/jogadores', 500), { erro: 'Erro interno do servidor.' });
      });
    } finally {
      await new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
    }
  } finally {
    await sequelize.close();
  }
});
