const { DataTypes } = require('sequelize');
const sequelize = require('../config/banco');

const POSICOES = ['G', 'Z', 'M', 'A'];
const TIPOS = ['F', 'T', 'E'];
const id = () => ({ type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true });
const decimal = () => ({ type: DataTypes.DECIMAL(15, 2), allowNull: false });

const Jogador = sequelize.define('Jogador', {
  id: id(),
  nome: { type: DataTypes.STRING, allowNull: false, validate: { notEmpty: true } },
  posicao: {
    type: DataTypes.ENUM(...POSICOES), allowNull: false, validate: { isIn: [POSICOES] },
  },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'jogadores' });

const Treino = sequelize.define('Treino', {
  id: id(),
  codigo: {
    type: DataTypes.STRING(64), allowNull: false, unique: true, validate: { notEmpty: true },
  },
  jogadorId: { type: DataTypes.INTEGER, allowNull: false },
  dataTreino: { type: DataTypes.DATE, allowNull: false, validate: { isDate: true } },
  tipo: { type: DataTypes.ENUM(...TIPOS), allowNull: false, validate: { isIn: [TIPOS] } },
  duracaoMin: { type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1 } },
  intensidade: {
    type: DataTypes.INTEGER, allowNull: false, validate: { isInt: true, min: 1, max: 10 },
  },
  carga: {
    ...decimal(),
    get() {
      const valor = this.getDataValue('carga');
      return valor == null ? valor : Number(valor);
    },
  },
}, { tableName: 'treinos', indexes: [{ fields: ['dataTreino'] }] });

const Configuracao = sequelize.define('Configuracao', {
  id: id(),
  cargaMaximaSemanal: { ...decimal(), validate: { min: 0 } },
  dataVigencia: { type: DataTypes.DATE },
  chaveVigencia: { type: DataTypes.STRING(10), unique: true, allowNull: false },
}, { tableName: 'configuracoes' });

Jogador.hasMany(Treino, { as: 'treinos', foreignKey: 'jogadorId', onDelete: 'RESTRICT' });
Treino.belongsTo(Jogador, { as: 'jogador', foreignKey: 'jogadorId', onDelete: 'RESTRICT' });

module.exports = { sequelize, Jogador, Treino, Configuracao, POSICOES, TIPOS };
