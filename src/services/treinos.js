const { Op } = require('sequelize');
const { sequelize, Treino, POSICOES, TIPOS } = require('../models');
const { consultarJogador } = require('./jogadores');
const { ErroHttp, invalido, idPositivo, texto, opcao, dia, somarDias, corpo } = require('./validacao');

const MULTIPLICADORES_EM_DECIMOS = { F: 15, T: 12, E: 10 };

function calcularCarga(duracaoMin, intensidade, tipo) {
  return (duracaoMin * intensidade * MULTIPLICADORES_EM_DECIMOS[tipo]) / 100;
}

async function registrarTreino(dados) {
  corpo(dados);
  const codigo = texto(dados.codigo, 'codigo', 64);
  const jogadorId = idPositivo(dados.jogadorId);
  const dataTreino = dia(dados.dataTreino, 'dataTreino');
  const tipo = opcao(dados.tipo, 'tipo', TIPOS);
  const { duracaoMin, intensidade } = dados;
  if (!Number.isInteger(duracaoMin) || duracaoMin < 1 || duracaoMin > 2147483647) {
    invalido('duracaoMin deve ser um inteiro positivo.');
  }
  if (!Number.isInteger(intensidade) || intensidade < 1 || intensidade > 10) {
    invalido('intensidade deve ser um inteiro entre 1 e 10.');
  }

  return await sequelize.transaction(async (transaction) => {
    const jogador = await consultarJogador(jogadorId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!jogador.ativo) throw new ErroHttp(409, 'Jogador inativo.');
    return await Treino.create({
      codigo, jogadorId, dataTreino, tipo, duracaoMin, intensidade,
      carga: calcularCarga(duracaoMin, intensidade, tipo),
    }, { transaction });
  });
}

async function listarTreinos({ jogadorId, tipo, posicao, inicio, fim }) {
  const where = {};
  const include = { association: 'jogador', required: true };
  if (jogadorId !== undefined) where.jogadorId = idPositivo(jogadorId);
  if (tipo !== undefined) where.tipo = opcao(tipo, 'tipo', TIPOS);
  if (posicao !== undefined) include.where = { posicao: opcao(posicao, 'posicao', POSICOES) };
  const primeiroDia = inicio === undefined ? null : dia(inicio, 'inicio');
  const ultimoDia = fim === undefined ? null : dia(fim, 'fim');
  if (primeiroDia && ultimoDia && primeiroDia > ultimoDia) invalido('inicio deve ser anterior ou igual a fim.');
  if (primeiroDia || ultimoDia) {
    where.dataTreino = {};
    if (primeiroDia) where.dataTreino[Op.gte] = primeiroDia;
    if (ultimoDia) where.dataTreino[Op.lt] = somarDias(ultimoDia, 1);
  }

  return await Treino.findAll({ where, include, order: [['dataTreino', 'ASC'], ['id', 'ASC']] });
}

async function excluirTreino(codigo) {
  const removidos = await Treino.destroy({ where: { codigo: texto(codigo, 'codigo', 64) } });
  if (!removidos) throw new ErroHttp(404, 'Treino não encontrado.');
  return { mensagem: 'Treino excluído.' };
}

module.exports = { calcularCarga, registrarTreino, listarTreinos, excluirTreino };
