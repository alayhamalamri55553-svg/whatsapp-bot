import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { createServer } from 'http';

// Keep alive server for Railway
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('WhatsApp Bot Running!');
});
server.listen(process.env.PORT || 3000);

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) console.log('QR CODE:', qr);
    if (connection === 'open') console.log('✅ Bot Connected!');
    if (connection === 'close') startBot();
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const chatId = msg.key.remoteJid;
    if (!chatId.endsWith('@g.us')) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text.startsWith('.')) return;
    
    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const senderId = msg.key.participant;
    const groupMeta = await sock.groupMetadata(chatId);
    const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);
    const isAdmin = admins.includes(senderId);

    if (text.startsWith('.طرد') && isAdmin && mentioned.length) {
      for (const m of mentioned) {
        await sock.groupParticipantsUpdate(chatId, [m], 'remove');
        await sock.sendMessage(chatId, { text: `✅ تم طرد @${m.split('@')[0]}`, mentions: [m] });
      }
    } else if (text === '.مساعدة') {
      await sock.sendMessage(chatId, { text: '🤖 الأوامر:\n.طرد @عضو\n.مساعدة' });
    }
  });
}

startBot();
