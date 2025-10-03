const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const path = require('path');

// --- CONFIGURATION ---
const TOKEN = '7646114225:AAGWx9W2L1HyCTjeT-qFCF9wfKg6sdMeESM'; 
const PORT = process.env.PORT || 3000;
const ADMIN_CHAT_ID = '7940816594'; // 👈 Add your numeric User ID here

// --- INITIALIZATION ---
const app = express();
const bot = new TelegramBot(TOKEN, { polling: true });

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// --- BOT LOGIC ---
bot.on('message', async (msg) => {
    if (msg.web_app_data) {
        const userChatId = msg.chat.id; // The user who submitted the ticket
        const data = msg.web_app_data.data;
        
        try {
            const ticketData = JSON.parse(data);
            const { subject, description } = ticketData;
            const userInfo = msg.from;

            // In a real app, save this to a database
            console.log(`New ticket from ${userInfo.first_name} (@${userInfo.username})`);
            
            // --- ACTION 1: Send confirmation to the USER ---
            const ticketId = Math.floor(1000 + Math.random() * 9000);
            const userReplyMessage = `✅ Ticket Received!\n\nThank you, ${userInfo.first_name}. Your ticket has been created.\n\n*Ticket ID:* \`${ticketId}\`\n*Subject:* ${subject}`;
            await bot.sendMessage(userChatId, userReplyMessage, { parse_mode: 'Markdown' });

            // --- ACTION 2: Forward ticket to the ADMIN/OWNER ---
            const adminNotificationMessage = `🔔 *New Support Ticket*\n\n*From:* ${userInfo.first_name} (@${userInfo.username || 'N/A'})\n*User ID:* \`${userInfo.id}\`\n*Ticket ID:* \`${ticketId}\`\n\n*Subject:* ${subject}\n*Description:* ${description}`;
            
            // Make sure you have started a chat with your bot first!
            await bot.sendMessage(ADMIN_CHAT_ID, adminNotificationMessage, { parse_mode: 'Markdown' });

        } catch (error) {
            console.error("Error processing ticket data:", error);
            await bot.sendMessage(userChatId, "Sorry, there was an error creating your ticket.");
        }
    }
});

// A simple welcome message
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome! Click the menu button to open a support ticket.");
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});