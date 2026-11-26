const { sequelize, Jogador, Treino, Configuracao } = require('../src/models');
const { calcularCarga } = require('../src/services/treinos');
const { atualizarConfiguracao } = require('../src/services/configuracao');
const massa = require('./massa');

async function popular() {
  try {
    const quantidade = await sequelize.transaction(async (transaction) => {
      if (await Treino.count({ transaction, where: { codigo: massa.treinos.map(({ codigo }) => codigo) } })) {
        return 0;
      }

      const jogadores = [];
      for (const dados of massa.jogadores) {
        jogadores.push(await Jogador.create(dados, { transaction }));
      }
      const treinos = massa.treinos.map(({ jogador, ...dados }) => ({
        ...dados,
        jogadorId: jogadores[jogador].id,
        carga: calcularCarga(dados.duracaoMin, dados.intensidade, dados.tipo),
      }));
      await Treino.bulkCreate(treinos, { transaction, validate: true });
      if (!await Configuracao.count({ transaction })) {
        await atualizarConfiguracao(massa.limite, transaction);
      }
      return treinos.length;
    });
    console.log(quantidade ? `Massa criada com 6 atletas e ${quantidade} treinos.` :
      'A base já contém códigos da massa de demonstração.');
  } catch (erro) {
    console.error('Falha ao carregar a massa (%s). Confira a base de desenvolvimento.', erro.name);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

popular();
