const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const path = require('path');

// =======================================================================
//                          CONFIGURATION
// =======================================================================
// ❗️ 1. REPLACE WITH YOUR BOT TOKEN FROM @BOTFATHER
const TOKEN = '7646114225:AAFAGkM1X15bGX1PecCJFf-4SM38GOvS0tY';

// ❗️ 2. REPLACE WITH YOUR NUMERIC TELEGRAM USER ID (GET IT FROM @userinfobot)
const ADMIN_CHAT_ID = '7940816594'; 

// ❗️ 3. REPLACE WITH YOUR MINI APP'S PUBLIC URL AFTER DEPLOYMENT
const WEB_APP_URL = 'https://swipemadedev-sketch.github.io/telegram-automated-ez/';
// =======================================================================


// --- SERVER AND BOT INITIALIZATION ---
const app = express();
const bot = new TelegramBot(TOKEN, { polling: true });
const PORT = process.env.PORT || 3000;

// --- IN-MEMORY DATABASE (FOR DEMONSTRATION) ---
// ⚠️ This data will be lost when the server restarts. Use a real database for production.
const ticketsDB = {}; // Stores ticket info: { ticketId: { ...ticketData } }
const userState = {}; // Stores user's current action: { userId: { action: 'replying', ticketId: ... } }

// --- MIDDLEWARE ---
app.use(express.static(path.join(__dirname))); // Serve static files (index.html, script.js)
app.use(express.json());
app.use(cors());

// --- BOT LOGIC ---

// 1. Handle the /start command to show the Mini App button
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to Support! Click the button below to create a new ticket.", {
        reply_markup: {
            inline_keyboard: [[{ text: 'Create a New Ticket', web_app: { url: WEB_APP_URL } }]]
        }
    });
});

// 2. Main handler for ALL incoming messages
bot.on('message', async (msg) => {
    // A. If the message contains 'web_app_data', it's a new ticket submission
    if (msg.web_app_data) {
        return handleNewTicket(msg);
    }
    
    // B. Ignore commands (like /start) as they are handled separately
    if (msg.text && msg.text.startsWith('/')) {
        return;
    }

    const userId = msg.from.id;

    // C. Check if the message is from the ADMIN replying to a ticket
    if (userId.toString() === ADMIN_CHAT_ID && userState[userId]?.action === 'replying') {
        return handleAdminReply(msg);
    }

    // D. Check if the message is from a USER with an open ticket
    return handleUserFollowUp(msg);
});

// 3. Handle admin actions from inline buttons (Reply, Close)
bot.on('callback_query', (query) => {
    const adminId = query.from.id;
    // Security check: only the admin can click the buttons
    if (adminId.toString() !== ADMIN_CHAT_ID) return bot.answerCallbackQuery(query.id);

    const [action, ticketId] = query.data.split('_');
    const ticket = ticketsDB[ticketId];

    if (!ticket) return bot.answerCallbackQuery(query.id, { text: 'Error: Ticket not found.' });

    if (action === 'reply') {
        // Set the admin's state to 'replying' for this specific ticket
        userState[adminId] = { action: 'replying', ticketId: ticketId };
        bot.sendMessage(adminId, `✍️ Please send your reply for Ticket #${ticketId}.`);
        bot.answerCallbackQuery(query.id); // Acknowledge the button press
    }

    if (action === 'close') {
        ticket.status = 'closed';
        bot.sendMessage(ticket.user.id, `✅ Ticket #${ticketId} has been marked as closed by an admin.`);
        
        // Update the original admin message to show it's closed and remove buttons
        const closedMessage = `✅ *Ticket #${ticketId} - Closed*\n\n*From:* ${ticket.user.first_name}\n*Subject:* ${ticket.subject}`;
        bot.editMessageText(closedMessage, {
            chat_id: ADMIN_CHAT_ID,
            message_id: query.message.message_id,
            parse_mode: 'Markdown',
            reply_markup: {} // Empty reply_markup removes the buttons
        });
        bot.answerCallbackQuery(query.id, { text: 'Ticket has been closed.' });
    }
});

// --- HELPER FUNCTIONS ---

async function handleNewTicket(msg) {
    try {
        const userChatId = msg.chat.id;
        const ticketData = JSON.parse(msg.web_app_data.data);
        const userInfo = msg.from;
        const ticketId = Date.now(); // Use timestamp as a simple unique ID

        ticketsDB[ticketId] = {
            id: ticketId,
            user: userInfo,
            subject: ticketData.subject,
            status: 'open',
            adminTicketMessageId: null
        };

        await bot.sendMessage(userChatId, `✅ Ticket #${ticketId} created! An admin will review it shortly.`);

        const adminMessage = `🔔 *New Ticket #${ticketId}*\n\n*From:* ${userInfo.first_name} (@${userInfo.username || 'N/A'})\n*User ID:* \`${userInfo.id}\`\n*Subject:* ${ticketData.subject}\n\n*Description:* ${ticketData.description}`;
        const adminOptions = {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '✍️ Reply to User', callback_data: `reply_${ticketId}` }, { text: '❌ Close Ticket', callback_data: `close_${ticketId}` }]
                ]
            }
        };

        const sentMessage = await bot.sendMessage(ADMIN_CHAT_ID, adminMessage, adminOptions);
        ticketsDB[ticketId].adminTicketMessageId = sentMessage.message_id;

    } catch (error) {
        console.error("Error creating new ticket:", error);
    }
}

async function handleAdminReply(msg) {
    const adminId = msg.from.id;
    const { ticketId } = userState[adminId];
    const ticket = ticketsDB[ticketId];

    if (ticket && ticket.status === 'open') {
        await bot.sendMessage(ticket.user.id, `*Admin Reply for Ticket #${ticketId}:*\n\n${msg.text}`, { parse_mode: 'Markdown' });
        await bot.sendMessage(adminId, '✅ Your reply has been sent to the user.');
    } else {
        await bot.sendMessage(adminId, '⚠️ Could not send reply. The ticket might be closed or invalid.');
    }
    
    delete userState[adminId]; // Clear the admin's 'replying' state
}

async function handleUserFollowUp(msg) {
    const userId = msg.from.id;
    // Find the user's open ticket, if any
    const openTicketId = Object.keys(ticketsDB).find(tid => ticketsDB[tid].user.id === userId && ticketsDB[tid].status === 'open');

    if (openTicketId) {
        const ticket = ticketsDB[openTicketId];
        await bot.sendMessage(ADMIN_CHAT_ID, `💬 *Follow-up for Ticket #${openTicketId}:*\n\n${msg.text}`, {
            reply_to_message_id: ticket.adminTicketMessageId,
            parse_mode: 'Markdown'
        });
        await bot.sendMessage(userId, 'Your message has been added to the ticket.');
    } else {
        await bot.sendMessage(userId, "You don't have any open tickets. Please /start to create a new one.");
    }
}


// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
