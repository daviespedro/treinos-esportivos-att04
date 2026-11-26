const { Op } = require('sequelize');
const { Configuracao } = require('../models');
const { ErroHttp, invalido, dia, corpo } = require('./validacao');

function apresentar(configuracao) {
  return {
    id: configuracao.id,
    cargaMaximaSemanal: Number(configuracao.cargaMaximaSemanal),
    dataVigencia: configuracao.dataVigencia?.toISOString().slice(0, 10) ?? null,
  };
}

async function consultarConfiguracao(referencia = new Date(), transaction) {
  const configuracao = await Configuracao.findOne({
    where: { [Op.or]: [{ dataVigencia: { [Op.lte]: referencia } }, { dataVigencia: null }] },
    order: [['dataVigencia', 'DESC']],
    transaction,
  });
  if (!configuracao) throw new ErroHttp(404, 'Limite semanal não configurado para a data.');
  return apresentar(configuracao);
}

async function atualizarConfiguracao(dados, transaction) {
  corpo(dados);
  const limite = dados.cargaMaximaSemanal;
  if (typeof limite !== 'number' || limite < 0 || limite > 9999999999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(String(limite))) {
    invalido('cargaMaximaSemanal deve ser um número não negativo com até duas casas decimais.');
  }
  const dataVigencia = dados.dataVigencia == null ? null : dia(dados.dataVigencia, 'dataVigencia');
  const chaveVigencia = dataVigencia ? dados.dataVigencia : 'padrao';
  await Configuracao.upsert({ cargaMaximaSemanal: limite, dataVigencia, chaveVigencia }, { transaction });
  const configuracao = await Configuracao.findOne({ where: { chaveVigencia }, transaction });
  return apresentar(configuracao);
}

module.exports = { consultarConfiguracao, atualizarConfiguracao };
