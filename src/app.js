const express = require('express');
const path = require('node:path');
const swagger = require('swagger-ui-dist');
const rotas = require('./routes');
const { tratarErros } = require('./controllers');
const openapi = require('../docs/openapi.json');

const app = express();
app.use(express.json());
app.get('/openapi.json', (req, res) => res.json(openapi));
app.get('/docs', (req, res) => res.sendFile(path.resolve(__dirname, '../docs/swagger.html')));
app.use('/docs', express.static(swagger.getAbsoluteFSPath(), { index: false }));
app.use(rotas);
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));
app.use(tratarErros);

module.exports = app;
