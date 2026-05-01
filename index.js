import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { createServer } from 'http';
import qrcode from 'qrcode-terminal';

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('WhatsApp Bot Running!');
});
server.listen(process.env.PORT || 3000);

console.log('Bot starting...');

async function startBot() {
  console.log('Initializing...');
  const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ qr, connection }) => {
    if (qr) {
      console.log('QR RECEIVED');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') console.log('Connected!');
    if (connection === 'close') startBot();
  });
}

startBot();
