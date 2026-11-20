// EMON local-AI bridge, container half: TCP :11434 on the worldmonitor docker network -> unix socket -> host Ollama.
const net = require('net');
net.createServer((c) => {
  const u = net.connect('/sock/ollama.sock');
  c.pipe(u); u.pipe(c);
  const end = () => { c.destroy(); u.destroy(); };
  c.on('error', end); u.on('error', end); c.on('close', end); u.on('close', end);
}).listen(11434, '0.0.0.0');
