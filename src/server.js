const { once } = require('node:events');
const app = require('./app');
const { sequelize } = require('./models');

async function iniciar() {
  try {
    await sequelize.authenticate();
    const porta = Number(process.env.PORT || 3000);
    const servidor = app.listen(porta, '127.0.0.1');
    await once(servidor, 'listening');
    console.log(`Swagger disponível em http://127.0.0.1:${servidor.address().port}/docs/`);
  } catch (erro) {
    console.error('Falha ao iniciar a API. Confira a configuração do MySQL e da porta.');
    process.exitCode = 1;
    await sequelize.close();
  }
}

iniciar();
