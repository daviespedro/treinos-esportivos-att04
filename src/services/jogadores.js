const { Jogador, POSICOES } = require('../models');
const { ErroHttp, invalido, idPositivo, texto, opcao, corpo } = require('./validacao');

async function cadastrarJogador(dados) {
  corpo(dados);
  return await Jogador.create({
    nome: texto(dados.nome, 'nome', 255),
    posicao: opcao(dados.posicao, 'posicao', POSICOES),
  });
}

async function listarJogadores({ posicao, ativo }) {
  const where = {};
  if (posicao !== undefined) where.posicao = opcao(posicao, 'posicao', POSICOES);
  if (ativo !== undefined) where.ativo = opcao(ativo, 'ativo', ['true', 'false']) === 'true';
  return await Jogador.findAll({ where, order: [['id', 'ASC']] });
}

async function consultarJogador(id, options) {
  const jogador = await Jogador.findByPk(idPositivo(id), options);
  if (!jogador) throw new ErroHttp(404, 'Jogador não encontrado.');
  return jogador;
}

async function atualizarJogador(id, dados) {
  corpo(dados);
  const alteracoes = {};
  if (dados.nome !== undefined) alteracoes.nome = texto(dados.nome, 'nome', 255);
  if (dados.posicao !== undefined) alteracoes.posicao = opcao(dados.posicao, 'posicao', POSICOES);
  if (!Object.keys(alteracoes).length) invalido('Informe nome ou posicao para atualizar.');
  const jogador = await consultarJogador(id);
  return await jogador.update(alteracoes);
}

async function desativarJogador(id) {
  const jogador = await consultarJogador(id);
  return await jogador.update({ ativo: false });
}

module.exports = { cadastrarJogador, listarJogadores, consultarJogador, atualizarJogador, desativarJogador };
