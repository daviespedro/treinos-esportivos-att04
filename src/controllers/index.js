const { UniqueConstraintError, ValidationError } = require('sequelize');
const { sequelize } = require('../models');
const jogadores = require('../services/jogadores');
const treinos = require('../services/treinos');
const configuracao = require('../services/configuracao');
const { gerarRelatorioSemanal } = require('../services/relatorios');
const { ErroHttp, dia } = require('../services/validacao');

function responder(operacao, status = 200) {
  return async (req, res, next) => {
    try {
      const resultado = await operacao(req);
      res.status(status).json(resultado);
    } catch (erro) {
      next(erro);
    }
  };
}

function tratarErros(erro, req, res, next) {
  if (res.headersSent) return next(erro);
  if (erro instanceof ErroHttp) return res.status(erro.status).json({ erro: erro.message });
  if (erro instanceof UniqueConstraintError) {
    return res.status(409).json({ erro: 'Já existe um registro com esse código.' });
  }
  if (erro instanceof ValidationError || erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Dados da requisição inválidos.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Corpo da requisição acima do tamanho permitido.' });
  }
  console.error('Falha ao processar a requisição (%s).', erro.name);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}

module.exports = {
  cadastrarJogador: responder((req) => jogadores.cadastrarJogador(req.body), 201),
  listarJogadores: responder((req) => jogadores.listarJogadores(req.query)),
  consultarJogador: responder((req) => jogadores.consultarJogador(req.params.id)),
  atualizarJogador: responder((req) => jogadores.atualizarJogador(req.params.id, req.body)),
  desativarJogador: responder((req) => jogadores.desativarJogador(req.params.id)),
  consultarConfiguracao: responder((req) => {
    const referencia = req.query.data === undefined ? undefined : dia(req.query.data, 'data');
    return configuracao.consultarConfiguracao(referencia);
  }),
  atualizarConfiguracao: responder((req) => sequelize.transaction(
    (transaction) => configuracao.atualizarConfiguracao(req.body, transaction),
  )),
  registrarTreino: responder((req) => treinos.registrarTreino(req.body), 201),
  listarTreinos: responder((req) => treinos.listarTreinos(req.query)),
  listarTreinosDoJogador: responder(async (req) => {
    const jogador = await jogadores.consultarJogador(req.params.id);
    return await treinos.listarTreinos({ ...req.query, jogadorId: jogador.id });
  }),
  excluirTreino: responder((req) => treinos.excluirTreino(req.params.codigo)),
  gerarRelatorioSemanal: responder((req) => gerarRelatorioSemanal(req.query.data)),
  tratarErros,
};
