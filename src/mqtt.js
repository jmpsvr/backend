import { connect } from 'mqtt';

import { v4 as uuidv4 } from 'uuid';

export default ({ config, db }, callback) => {
  const client = connect({
    host: config.emqx.host,
    port: config.emqx.tcp_port,
    username: config.emqx.super_username,
    password: config.emqx.super_password
  });

  const subscribe = (topic) => {
    client.subscribe(topic, { qos: 2 }, (err) => {
      if (err) {
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

      // execute actions
      db.query('SELECT * FROM actions').then((row) => {
        for(let i of row) {
          const item = JSON.parse(i.condition);
          if(item?.type === 'mqtt') {
            const { device, key, condition } = item;
            if(device === deviceId) {
              // vars[key]

              const iteratorRegex = [
                { type: '==', regex: /^==\d+$/, match: /\d+/ },
                { type: '<', regex: /^<\d+$/, match: /\d+/ },
                { type: '>', regex: /^>\d+$/, match: /\d+/ },
                { type: '<=', regex: /^<=\d+$/, match: /\d+/ },
                { type: '>=', regex: /^>=\d+$/, match: /\d+/ }
              ];
              const match = iteratorRegex.find(item => item.regex.test(condition));
              const source = vars.find(item => item.key === key).value;
              let result = false;
              switch(match.type) {
                case '==':
                  if(source == condition.match(match.match)[0]) {
                    result = true;
                  }
                  break;
                case '<':
                  if(source < condition.match(match.match)[0]) {
                    result = true;
                  }
                  break;
                case '>':
                  if(source > condition.match(match.match)[0]) {
                    result = true;
                  }
                  break;
                case '<=':
                  if(source <= condition.match(match.match)[0]) {
                    result = true;
                  }
                  break;
                case '>=':
                  if(source >= condition.match(match.match)[0]) {
                    result = true;
                  }
                  break;
              }
              if(result) {
                const trigger = JSON.parse(i.trigger);
                if(trigger.type === 'mqtt') {
                  publish(`control/${trigger.device}`, JSON.stringify({ cmd: trigger.cmd }));
                } else if(trigger.type === 'notice') {
                  db.query('INSERT INTO notices (event, did, icon, uuid) VALUES (${event}, ${did}, ${icon}, ${uuid})', {
                    event: trigger?.event,
                    did: trigger?.deviceId || deviceId,
                    icon: trigger?.icon,
                    uuid: uuidv4()
                  });
                } else { // invalid
                  console.log(trigger);
                }
              }
            }
          }
        }
        
      }).catch(err => {
        console.error(err);
      });

      // save to db
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

  callback({ subscribe, publish });
}