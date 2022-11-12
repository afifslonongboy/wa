const qrcode = require('qrcode');
const qrcodeTer = require('qrcode-terminal');
const fs = require('fs');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const { Client, MessageMedia, LocalAuth, Location, Buttons, List } = require('whatsapp-web.js');
const { response } = require('express');
const axios = require('axios');
const mime = require('mime-types');
const fileUpload = require('express-fileupload');
const { body, validationResult } = require('express-validator');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(fileUpload({
  debug: false
}));

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: __dirname
    });
});

client.on('qr', qr => {
    qrcodeTer.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log("WhatsApp Web v", await client.getWWebVersion());
    console.log("WWebJS v", require("whatsapp-web.js").version);
    console.log('whatsapp sudah terhubung.....')
});

client.initialize();

client.on('message', async msg => {
    let chat = await msg.getChat();
    //console.log(chat);
    chat.sendSeen();
    if (chat.isGroup) {
        if (msg.body == '.fitur') {
            msg.reply(`
 *Fitur Yang Tersedia*
1. Tag Semua Member.
2. Ubah Gambar ke Sticker.
3. Ubah Sticker ke Gambar.

 _untuk cara pakai ketikan *.tutor*_
            `);
        } else if (msg.body == '.tutor') {
            msg.reply(`
 *Tutor Whatsapp Bot By Afif Slonongboy*
1. Tag Semua Member.
   - ketik *.tag* + (pesan yang ingin disampaikan).
2. Ubah Gambar ke Sticker.
   - kirim sebuah gambar/foto dengan caption *.sticker*.
3. Ubah Sticker ke Gambar.
   - kirim sticker yang ingin diubah menjadi sebuah gambar.
   - balas sticker tersebut dengan balasan *.toimg*.
  + note = hanya sticker yang dikirim oleh pengirim yang bisa diubah menjadi gambar.
            `);
        }
            // ubah gambar jadi sticker
        else if (msg.body === '.sticker') {
            if (msg.hasMedia) {
                msg.downloadMedia().then(media => {

                    if (media) {

                        const mediaPath = './downloaded-media/';

                        if (!fs.existsSync(mediaPath)) {
                            fs.mkdirSync(mediaPath);
                        }


                        const extension = mime.extension(media.mimetype);

                        const filename = new Date().getTime();

                        const fullFilename = mediaPath + filename + '.' + extension;

                        // Save to file
                        try {
                            fs.writeFileSync(fullFilename, media.data, { encoding: 'base64' });
                            console.log('File downloaded successfully!', fullFilename);
                            console.log(fullFilename);
                            MessageMedia.fromFilePath(filePath = fullFilename)
                            client.sendMessage(msg.from, new MessageMedia(media.mimetype, media.data, filename), {
                                sendMediaAsSticker: true,
                                stickerAuthor: "Created By Afif Slonongboy",
                                stickerName: "Stickers"
                            })
                            fs.unlinkSync(fullFilename)
                            console.log(`File Deleted successfully!`,);
                        } catch (err) {
                            console.log('Failed to save the file:', err);
                            console.log(`File Deleted successfully!`,);
                        }
                    }
                });
            } else {
                msg.reply(`kirim gambar dengan caption *.sticker* `)
            }
        }
            // ubah sticker jadi gambar
        else if (msg.body === '.toimg' && msg.hasQuotedMsg) {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg.hasMedia) {
                if (quotedMsg.type === 'sticker') {
                    const attachmentData = await quotedMsg.downloadMedia();
                    client.sendMessage(msg.from, attachmentData, { caption: 'done!' });
                }
            }
        }
            // tag semua member
        else if (msg.body.startsWith('.tag ')) {
            const chat = await msg.getChat();

            let text = msg.body.slice(5);
            let mentions = [];

            for (let participant of chat.participants) {
                const contact = await client.getContactById(participant.id._serialized);

                mentions.push(contact);
                text = text;
                console.log(participant.id);
            }

            await chat.sendMessage(text, { mentions });

        };
    }
});

client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('Selamat Bergabung kau anjing.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('Pergi Sana Kau Anjing.');
});

// koneksi socket io
io.on('connection', function (socket) {
    socket.emit('message', 'Menghubungkan..');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'Kode QR sudah diterima, silahkan scan! ');
        });
    });
    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp Sudah Terhubung!');
        socket.emit('message', 'Whatsapp Sudah Terhubung!');
    });
    socket.on('ready', function (data) {
        $('#qrcode').hide();
    });
});



    server.listen(port, function () {
        console.log('Buka di browser http://localhost:' + port);
    });