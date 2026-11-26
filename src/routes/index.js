const express = require('express');
const controller = require('../controllers');

const rotas = express.Router();
rotas.post('/jogadores', controller.cadastrarJogador);
rotas.get('/jogadores', controller.listarJogadores);
rotas.get('/jogadores/:id', controller.consultarJogador);
rotas.put('/jogadores/:id', controller.atualizarJogador);
rotas.patch('/jogadores/:id/desativar', controller.desativarJogador);
rotas.get('/configuracao', controller.consultarConfiguracao);
rotas.put('/configuracao', controller.atualizarConfiguracao);
rotas.post('/treinos', controller.registrarTreino);
rotas.get('/treinos', controller.listarTreinos);
rotas.get('/treinos/jogador/:id', controller.listarTreinosDoJogador);
rotas.delete('/treinos/:codigo', controller.excluirTreino);
rotas.get('/relatorios/semanal', controller.gerarRelatorioSemanal);

module.exports = rotas;
