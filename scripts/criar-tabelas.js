const { sequelize } = require('../src/models');

async function criarTabelas() {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Sincronização reservada ao ambiente de desenvolvimento.');
    }
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Tabelas verificadas e criadas quando necessário.');
  } catch (erro) {
    console.error('Falha ao criar tabelas (%s). Confira a configuração e as permissões do MySQL.', erro.name);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

criarTabelas();
