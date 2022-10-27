import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { ServerStyleSheets } from '@material-ui/core/styles';
import uEmojiParser from 'universal-emoji-parser';
import App from './display/components/app';

const app = express();

app.set('view engine', 'ejs');
// production bundle does not link the ejs module for some reason
// eslint-disable-next-line no-underscore-dangle
app.engine('ejs', require('ejs').__express);

const isDevEnv = process.env.NODE_ENV === 'development';
// dev:
// server.js folder (__dirname):  \Oratio\assets\dist
// server process.cwd():  \Oratio
// prod:
// server.js folder (__dirname):  \Oratio\release\win-unpacked\resources\assets\dist
// server proces.cwd():  \Oratio\release\win-unpacked (where Oratio.exe is)
const assetsPath = '..';

app.set('views', path.join(__dirname, `${assetsPath}/dist/views`));

app.use('/', express.static(path.join(__dirname, `${assetsPath}/dist/static`)));
app.use(
  '/assets/sounds',
  express.static(path.join(__dirname, `${assetsPath}/sounds`))
);
app.use(
  '/assets/emotes',
  express.static(path.join(__dirname, `${assetsPath}/emotes`))
);

const manifest = fs.readFileSync(
  path.join(__dirname, `${assetsPath}/dist/static/manifest.json`),
  'utf-8'
);

const assets = JSON.parse(manifest);

// The request arg is not needed here but trips up lint and type checks
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
app.get('/', (req: express.Request, res: express.Response) => {
  const sheets = new ServerStyleSheets();
  const component = ReactDOMServer.renderToString(
    sheets.collect(React.createElement(App, { collab: false }))
  );
  const css = sheets.toString();
  res.render('display', { assets, component, css, isDevEnv, collab: false });
});

app.get('/collab', (req: express.Request, res: express.Response) => {
  const sheets = new ServerStyleSheets();
  const component = ReactDOMServer.renderToString(
    sheets.collect(React.createElement(App, { collab: true }))
  );
  const css = sheets.toString();
  res.render('display', { assets, component, css, isDevEnv, collab: true });
});

// Client bundle throws a lot of errors attempting to package static emote libraries
// The server node environment can handle the static files in the bundle
app.get('/emotes', (req: express.Request, res: express.Response) => {
  const emojiString = req.query.string;
  const emojiElement = uEmojiParser.parse(emojiString);
  let result = false;

  if (emojiString !== emojiElement) {
    result = true;
  }

  res.json({
    value: emojiElement,
    found: result,
  });
});

const server = createServer(app);
const ioOptions = isDevEnv
  ? {
      // this only needed in dev env since requests come from the webpack-dev-server
      cors: { origin: 'http://localhost:1212', methods: ['GET', 'POST'] },
    }
  : {};
const io = new Server(server, ioOptions);

let emoteMap: { [key: string]: string };
// NOTE: we could also use server-sent events (SSE) for this, since we don't
// need to respond to messages from the client (and use pipes/ipc to communicate
// with the server process instead)
io.on('connection', (socket: Socket) => {
  socket.on('phraseSend', (data) => {
    socket.broadcast.emit('phraseRender', data);
  });
  socket.on('phraseSendCollab', (data) => {
    socket.broadcast.emit('collabPhraseRender', data);
  });

  // send emote map on new connection
  if (emoteMap) {
    socket.emit('updateEmoteMapClient', { emoteNameToUrl: emoteMap });
  }

  // and when we receive an update
  socket.on('updateEmoteMap', (data) => {
    emoteMap = data.emoteNameToUrl;
    socket.broadcast.emit('updateEmoteMapClient', data);
  });
});

process.on('message', (m: { action: string; port: number }) => {
  if (m.action === 'listen') {
    const port = m.port || 4563;
    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } else if (m.action === 'stop') {
    server.close();
    process.exit(0);
  }
});

export default server;
