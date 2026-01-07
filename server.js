// server.js - Simple WebSocket chat server
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/cafe-game', (req, res) => {
    res.sendFile(path.join(__dirname, 'cafe-game.html'));
});

app.get('/chat-room', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat-room.html'));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected users
const users = new Map();
const messages = [];
const MAX_MESSAGES = 100;

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    // Generate unique ID for this user
    const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    let username = 'Guest🌸';
    
    // Send existing messages to new user
    ws.send(JSON.stringify({
        type: 'init',
        messages: messages.slice(-50),
        userId: userId
    }));
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'join':
                    username = message.username || 'Guest🌸';
                    users.set(ws, {
                        id: userId,
                        username: username,
                        emoji: message.emoji || '🌸',
                        joined: Date.now()
                    });
                    
                    // Broadcast user list update
                    broadcastUserList();
                    
                    // Broadcast join message
                    broadcast({
                        type: 'system',
                        content: `${username} joined the chat! 💕`
                    }, ws);
                    break;
                    
                case 'message':
                    if (!username || username === 'Guest🌸') {
                        username = 'Guest🌸' + Math.floor(Math.random() * 999);
                    }
                    
                    const chatMessage = {
                        id: Date.now(),
                        userId: userId,
                        username: username,
                        content: message.content,
                        emoji: getEmojiForUser(username),
                        timestamp: Date.now(),
                        type: 'chat'
                    };
                    
                    messages.push(chatMessage);
                    
                    // Keep only recent messages
                    if (messages.length > MAX_MESSAGES) {
                        messages.shift();
                    }
                    
                    // Broadcast to all clients
                    broadcast({
                        type: 'message',
                        message: chatMessage
                    });
                    break;
                    
                case 'typing':
                    broadcast({
                        type: 'typing',
                        userId: userId,
                        username: username,
                        isTyping: message.isTyping
                    }, ws);
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        if (users.has(ws)) {
            const user = users.get(ws);
            users.delete(ws);
            
            // Broadcast user left
            broadcast({
                type: 'system',
                content: `${user.username} left the chat 👋`
            });
            
            // Update user list
            broadcastUserList();
        }
        console.log('Client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            client.send(message);
        }
    });
}

function broadcastUserList() {
    const userList = Array.from(users.values());
    broadcast({
        type: 'userList',
        users: userList,
        onlineCount: userList.length
    });
}

function getEmojiForUser(username) {
    const emojis = ['💖', '🌸', '✨', '🎀', '💕', '💗', '💓', '💞', '💝', '💘'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return emojis[Math.abs(hash) % emojis.length];
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Femboy Cafe Chat Server running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} in your browser`);
    console.log(`💬 WebSocket server ready at ws://localhost:${PORT}`);
});
