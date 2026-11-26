const { Op, Transaction, col, fn } = require('sequelize');
const { sequelize, Treino, POSICOES, TIPOS } = require('../models');
const { consultarConfiguracao } = require('./configuracao');
const { dia, somarDias } = require('./validacao');

const agregado = (funcao, coluna, nome) => [fn(funcao, col(coluna)), nome];
const totalCarga = agregado('SUM', 'Treino.carga', 'cargaSemanal');
const quantidade = agregado('COUNT', 'Treino.id', 'totalTreinos');
const mediaCarga = agregado('AVG', 'Treino.carga', 'cargaMedia');
const formatoDia = (data) => data.toISOString().slice(0, 10);
const centavos = (valor) => Math.round(Number(valor) * 100);

function calcularMedias(chaves, linhas, chave) {
  const porChave = new Map(linhas.map((linha) => [linha[chave], linha]));
  return chaves.map((valor) => {
    const linha = porChave.get(valor);
    return {
      [chave]: valor,
      totalTreinos: Number(linha?.totalTreinos ?? 0),
      cargaMedia: linha ? Number(Number(linha.cargaMedia).toFixed(2)) : null,
    };
  });
}

async function gerarRelatorioSemanal(dataReferencia) {
  const referencia = dia(dataReferencia, 'data');
  const segunda = somarDias(referencia, -((referencia.getUTCDay() + 6) % 7));
  const domingo = somarDias(segunda, 6);
  const fimDoDomingo = somarDias(segunda, 7);
  fimDoDomingo.setUTCMilliseconds(-1);
  const where = { dataTreino: { [Op.between]: [segunda, fimDoDomingo] } };

  return await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
  }, async (transaction) => {
    const { cargaMaximaSemanal } = await consultarConfiguracao(segunda, transaction);
    const consulta = { where, transaction, raw: true };
    const include = [{ association: 'jogador', attributes: [], required: true }];
    const jogadorId = col('jogador.id');
    const nome = col('jogador.nome');
    const posicao = col('jogador.posicao');
    const linhasJogadores = await Treino.findAll({
      ...consulta,
      include,
      attributes: [[jogadorId, 'jogadorId'], [nome, 'nome'], [posicao, 'posicao'], totalCarga, quantidade],
      group: [jogadorId, nome, posicao],
      order: [[jogadorId, 'ASC']],
    });
    const linhasTipos = await Treino.findAll({
      ...consulta,
      attributes: ['tipo', quantidade, mediaCarga],
      group: ['tipo'],
    });
    const linhasPosicoes = await Treino.findAll({
      ...consulta,
      include,
      attributes: [[posicao, 'posicao'], quantidade, mediaCarga],
      group: [posicao],
    });
    const totalTreinos = await Treino.count({ where, transaction });
    const cargaTotal = await Treino.sum('carga', { where, transaction });

    const porJogador = linhasJogadores.map((linha) => {
      const cargaSemanal = Number(linha.cargaSemanal);
      const emRisco = centavos(cargaSemanal) > centavos(cargaMaximaSemanal);
      return {
        ...linha,
        cargaSemanal,
        totalTreinos: Number(linha.totalTreinos),
        emRisco,
        situacao: emRisco ? 'RISCO DE SOBRECARGA' : 'SEM SINAL DE SOBRECARGA',
      };
    });

    const cargas = porJogador.map((jogador) => jogador.cargaSemanal);
    const maior = cargas.reduce((maximo, carga) => Math.max(maximo, carga), -Infinity);
    const menor = cargas.reduce((minimo, carga) => Math.min(minimo, carga), Infinity);
    return {
      semana: { inicio: formatoDia(segunda), fim: formatoDia(domingo) },
      cargaMaximaSemanal,
      totalTreinos,
      cargaTotal: Number(cargaTotal ?? 0),
      jogadoresEmRisco: porJogador.filter((jogador) => jogador.emRisco).length,
      criterioRanking: 'Jogadores com pelo menos um treino na semana. Empates incluem todos os atletas empatados.',
      porJogador,
      maiorCargaSemanal: porJogador.filter((jogador) => jogador.cargaSemanal === maior),
      menorCargaSemanal: porJogador.filter((jogador) => jogador.cargaSemanal === menor),
      mediaPorTipo: calcularMedias(TIPOS, linhasTipos, 'tipo'),
      porPosicao: calcularMedias(POSICOES, linhasPosicoes, 'posicao'),
    };
  });
}

module.exports = { gerarRelatorioSemanal };
