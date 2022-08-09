import { connect } from "mqtt"

export default ({ config, db }, callback) => {
  const client = connect({
    host: config.emqx.host,
    port: config.emqx.tcp_port,
    username: config.emqx.super_username,
    password: config.emqx.super_password
  });

  const subscribe = (topic) => {
    client.subscribe(topic, { qos: 2 }, (err) => {
      if(err) {
        console.error(err);
      }
    });
  }

  const publish = (topic, payload) => {
    client.publish(topic, payload, { qos: 2, retain: false }, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }

  client.on('connect', () => {
    subscribe('report');
  });

  client.on('message', (topic, payload, packet) => {
    try {
      const data = JSON.parse(payload.toString());
      const { deviceId, vars, actions } = data;

      db.query('UPDATE devices SET var = ${var}, action = ${action} WHERE id = ${id}', {
        var: JSON.stringify(vars),
        action: JSON.stringify(actions),
        id: deviceId
      }).then(row => {
        // do nothing when success
      }).catch(err => {
        console.error(err);
      });

    } catch(err) {
      console.log(`Topic: ${topic}, Message: ${payload.toString()}, QoS: ${packet.qos}`);
    }
  });

  callback(client);
}