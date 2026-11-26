const jogadores = [
  { nome: 'Ana Costa', posicao: 'G' },
  { nome: 'Bruno Lima', posicao: 'Z' },
  { nome: 'Carla Reis', posicao: 'M' },
  { nome: 'Diego Alves', posicao: 'A' },
  { nome: 'Elisa Rocha', posicao: 'Z' },
  { nome: 'Felipe Dias', posicao: 'A' },
];

// Código, índice do atleta, data, tipo, duração e intensidade.
const sessoes = [
  ['DEMO-01', 0, '2026-10-05', 'F', 60, 8],
  ['DEMO-02', 0, '2026-10-07', 'T', 50, 8],
  ['DEMO-03', 0, '2026-10-11', 'E', 30, 10],
  ['DEMO-04', 1, '2026-10-05', 'F', 50, 8],
  ['DEMO-05', 1, '2026-10-08', 'E', 50, 8],
  ['DEMO-06', 2, '2026-10-06', 'T', 50, 6],
  ['DEMO-07', 2, '2026-10-10', 'F', 40, 4],
  ['DEMO-08', 3, '2026-10-07', 'E', 50, 6],
  ['DEMO-09', 4, '2026-10-09', 'T', 50, 5],
  ['DEMO-10', 5, '2026-10-11', 'F', 40, 5],
  ['DEMO-11', 0, '2026-10-12', 'E', 40, 5],
  ['DEMO-12', 0, '2026-10-15', 'T', 50, 6],
  ['DEMO-13', 1, '2026-10-12', 'F', 40, 8],
  ['DEMO-14', 2, '2026-10-13', 'F', 70, 10],
  ['DEMO-15', 2, '2026-10-15', 'T', 50, 8],
  ['DEMO-16', 2, '2026-10-18', 'E', 40, 5],
  ['DEMO-17', 3, '2026-10-14', 'F', 30, 6],
  ['DEMO-18', 3, '2026-10-16', 'T', 50, 5],
  ['DEMO-19', 4, '2026-10-14', 'E', 40, 4],
  ['DEMO-20', 5, '2026-10-18', 'F', 40, 6],
];

const treinos = sessoes.map(([codigo, jogador, dataTreino, tipo, duracaoMin, intensidade]) => ({
  codigo, jogador, dataTreino, tipo, duracaoMin, intensidade,
}));

module.exports = { jogadores, treinos, limite: { cargaMaximaSemanal: 100 } };
