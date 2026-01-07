// Alternative: Simple Node.js server for real chat
// Save as server.js and run: node server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('.')); // Serve HTML files from current directory

let users = new Map(); // socket.id -> user data
let messages = [];

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    
    // Send existing users and messages
    socket.emit('init', { 
        users: Array.from(users.values()), 
        messages: messages.slice(-50) // Last 50 messages
    });
    
    // Handle new user
    socket.on('join', (username) => {
        const user = {
            id: socket.id,
            name: username,
            emoji: getRandomEmoji(),
            joined: new Date().toISOString()
        };
        
        users.set(socket.id, user);
        socket.username = username;
        
        // Broadcast new user to all
        io.emit('userJoined', user);
        console.log(`${username} joined the chat`);
        
        // Broadcast user list update
        io.emit('userList', Array.from(users.values()));
    });
    
    // Handle new message
    socket.on('sendMessage', (messageData) => {
        const message = {
            id: Date.now(),
            userId: socket.id,
            username: socket.username,
            content: messageData.content,
            timestamp: new Date().toISOString()
        };
        
        messages.push(message);
        
        // Keep only last 1000 messages
        if (messages.length > 1000) {
            messages = messages.slice(-1000);
        }
        
        // Broadcast message to all
        io.emit('newMessage', message);
        console.log(`New message from ${socket.username}: ${messageData.content}`);
    });
    
    // Handle user typing
    socket.on('typing', (isTyping) => {
        socket.broadcast.emit('userTyping', {
            userId: socket.id,
            username: socket.username,
            isTyping
        });
    });
    
    // Handle user leaving
    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            const disconnectedUser = users.get(socket.id);
            users.delete(socket.id);
            
            // Broadcast user left to all
            io.emit('userLeft', disconnectedUser);
            io.emit('userList', Array.from(users.values()));
            console.log(`${disconnectedUser.name} left the chat`);
        }
    });
});

function getRandomEmoji() {
    const emojis = ['💖', '🌸', '✨', '🎀', '💕', '💗', '💓', '💞', '💝', '💘'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Femboy Cafe Chat Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}/chat-room.html in your browser`);
});