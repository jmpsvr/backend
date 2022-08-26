import { CronJob } from 'cron'; // https://github.com/kelektiv/node-cron/tree/master/examples

import { v4 as uuidv4 } from 'uuid';

let cronList = [];

export default ({ config, db, publish }, callback) => {
  const reload = () => {
    for(let i of cronList) {
      i.stop();
    }
    cronList = [];
    db.query('SELECT * FROM actions').then((row) => {
      for(let i of row) {
        const item = JSON.parse(i.condition);
        if(item?.type === 'cron') {
          const { cron } = item;
          const job = new CronJob(
            cron, // '* * * * * *'
            function() {
              const trigger = JSON.parse(i.trigger);
              if(trigger.type === 'mqtt') {
                publish(`control/${trigger.device}`, JSON.stringify({ cmd: trigger.cmd }));
              } else if(trigger.type === 'notice') {
                db.query('INSERT INTO notices (event, did, icon, uuid) VALUES (${event}, ${did}, ${icon}, ${uuid})', {
                  event: trigger?.event,
                  did: trigger?.deviceId,
                  icon: trigger?.icon,
                  uuid: uuidv4()
                });
              } else { // invalid
                console.log(trigger);
              }
            },
            null,
            true,
            'Asia/Shanghai'
          );
          cronList.push(job);
        }
      }
      
    }).catch(err => {
      console.error(err);
    });
  }

  reload();

  callback({ reload });
}