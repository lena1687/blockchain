import * as http from 'http';
// import * as path from 'path';
import * as WebSocket from 'ws';
import { BlockchainServer } from './blockchain-server';

const express = require('express');
const PORT = 3001;
const app = express();
// app.use('/', express.static(path.join(__dirname, '..', '..', 'public')));
// app.use(
//   '/node_modules',
//   express.static(path.join(__dirname, '..', '..', 'node_modules')),
// );

const httpServer: http.Server = app.listen(PORT, () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Listening on http://localhost:${PORT}`);
  }
});

const wsServer = new WebSocket.Server({ server: httpServer });
new BlockchainServer(wsServer);
