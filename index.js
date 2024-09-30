import express from 'express';
import cors from 'cors';
import logger from 'morgan';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import DBConnector from './dbconnector.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

(async () => {
    try {
        await DBConnector.query('CREATE TABLE IF NOT EXISTS messages (id INT AUTO_INCREMENT PRIMARY KEY, content TEXT, user TEXT)');
    } catch (e) {
        console.error('Error creating table:', e);
    }

    const port = process.env.PORT ?? 3000;

    const app = express();
    const server = createServer(app);

    // Configurar CORS para Express
    app.use(cors({ origin: ['http://localhost','https://192.168.237.93'] }));

    // Configurar CORS para Socket.IO
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        connectionStateRecovery: {}
    });

    io.on('connection', (socket) => {
        console.log('A user connected!');

        socket.on('disconnect', () => {
            console.log('A user has disconnected');
        });

        socket.on('chat message', async (msg) => {
            const user = socket.handshake.auth.username ?? 'Anonimo';

            try {
                await DBConnector.query('INSERT INTO messages (content, user) VALUES (?, ?)', [msg, user]);
                console.log(`Message: ${msg} from: ${user}`);

                const [latestMessage] = await DBConnector.query('SELECT * FROM messages ORDER BY id DESC LIMIT 1');

                io.emit('chat message', msg, latestMessage.id, user);
            } catch (e) {
                console.error('Error handling chat message:', e);
            }
        });

        if (!socket.recovered) {
            (async () => {
                try {
                    const serverOffset = socket.handshake.auth.serverOffset ?? 0;
                    const results = await DBConnector.query('SELECT id, content, user FROM messages WHERE id > ?', [serverOffset]);
                    results.forEach(result => {
                        socket.emit('chat message', result.content, result.id, result.user);
                    });
                } catch (e) {
                    console.error('Error sending previous messages:', e);
                }
            })();
        }
    });

    app.use(logger('dev'));

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'client', 'index.html'));
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on port ${port}`);
    });
})();
