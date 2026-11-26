class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

function invalido(mensagem) {
  throw new ErroHttp(400, mensagem);
}

function idPositivo(valor) {
  if (typeof valor === 'string' && /^\d+$/.test(valor)) valor = Number(valor);
  if (!Number.isInteger(valor) || valor < 1 || valor > 2147483647) {
    invalido('Informe um ID inteiro positivo.');
  }
  return valor;
}

function texto(valor, campo, limite) {
  if (typeof valor !== 'string' || !valor.trim() || Array.from(valor.trim()).length > limite) {
    invalido(`${campo} deve ter entre 1 e ${limite} caracteres.`);
  }
  return valor.trim();
}

function opcao(valor, campo, opcoes) {
  if (!opcoes.includes(valor)) invalido(`${campo} deve ser ${opcoes.join(', ')}.`);
  return valor;
}

function dia(valor, campo) {
  if (typeof valor !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(valor)) {
    invalido(`${campo} deve usar o formato AAAA-MM-DD.`);
  }
  const data = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
    invalido(`${campo} deve ser uma data válida.`);
  }
  return data;
}

function somarDias(data, quantidade) {
  const resultado = new Date(data);
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

function corpo(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    invalido('Envie um objeto JSON.');
  }
  return valor;
}

module.exports = { ErroHttp, invalido, idPositivo, texto, opcao, dia, somarDias, corpo };
