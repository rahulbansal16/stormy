const { Client } = require('ssh2');
const { getSSHConnectionObj } = require('./sshService')
const conn = new Client();

const executeRemote = async (cmd, uuid, outputCb) => {
  const sshConnectionObj = await getSSHConnectionObj(uuid)
  return new Promise( (resolve, reject) => {

    conn.on('ready', () => {
      conn.exec(cmd, { pty: {
        modes: 'VINTR'
      }}, (err, stream) => {
        if (err) throw err;
        
        const stdinListener = (data) => {
          skipNext = true;
          stream.stdin.write(data);
        }

        stream.on('close', (code, signal) => {
          if (code === 0){
            resolve(code)
          } else {
            reject(code)
          }
          conn.end();
          process.stdin.removeListener("data", stdinListener)
          return;
        })
        
        let skipNext = false;
        stream.stdout.on('data', (data) => {
          if (skipNext) { return skipNext = false; }
          process.stdout.write(data);
        })

        // Possibility to add different colors plus linking to google search
        stream.stderr.on('data', (data) => {
          console.log('Error ' + data)
          reject(data);
        })

        process.stdin.on('data', stdinListener)

      })
    }).connect(sshConnectionObj)
  });
}

module.exports = {
  executeRemote,
  sshClient: conn
}
