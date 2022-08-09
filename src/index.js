import http from 'http';
import express from 'express';
import morgan from 'morgan';
import initializeDb from './db';
import api from './api';
import config from './config.json';
import middleware from './middleware';
import startMQTT from './mqtt';

let app = express();
app.server = http.createServer(app);

// logger
app.use(morgan('dev'));

app.use(express.json({ type: '*/json' }));
app.use(express.urlencoded({ extended: false }));

initializeDb(config.postgres, (db) => {
  app.use(middleware);
  app.use('/api', api({ config, db }));
  
  app.server.listen(process.env.PORT || config.port, () => {
    console.log(`Started on port ${app.server.address().port}`);
  });
  startMQTT({ config, db }, (client) => {
    console.log(`MQTT started`);
  });
});

export default app;
