const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const axios = require('axios');
const logger = require('./utils/logger');
const { validatePhoneNumber, formatPhoneNumber } = require('./utils/validator');
const path = require('path');
const db = require('./db/whatsapp.db');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.connectionStatus = 'disconnected';
        this.messageHandlers = [];
        
        this.initializeClient();
    }

    cleanupStaleLocks(sessionDir) {
        const fs = require('fs');
        const lockFiles = [
            'lockfile',
            'DevToolsActivePort',
            'SingletonLock',
            'SingletonSocket',
            'SingletonCookie'
        ];

        try {
            for (const lockFile of lockFiles) {
                const lockPath = path.join(sessionDir, lockFile);
                if (fs.existsSync(lockPath)) {
                    fs.unlinkSync(lockPath);
                    logger.info(`Removed stale lock file: ${lockFile}`);
                }
            }
        } catch (error) {
            logger.warn('Could not clean up some lock files:', error.message);
        }
    }

    initializeClient() {
        try {
            const sessionPath = process.env.SESSION_PATH || './sessions';
            const clientSessionDir = path.resolve(sessionPath, 'session-whatsapp-api-client');

            // Clean up stale lock files from previous crashes or restarts
            this.cleanupStaleLocks(clientSessionDir);

            // Find Chrome executable - check environment variables first (Docker), then common locations
            const fs = require('fs');
            const chromePaths = [
                process.env.PUPPETEER_EXECUTABLE_PATH,  // Docker environment
                process.env.CHROME_PATH,
                '/usr/bin/chromium',                     // Linux/Docker
                '/usr/bin/chromium-browser',             // Linux alternative
                '/usr/bin/google-chrome',                // Linux Chrome
                'C:/Users/asaf1/.cache/puppeteer/chrome/win64-143.0.7499.192/chrome-win64/chrome.exe',
                'C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
            ].filter(Boolean);

            let executablePath = null;
            for (const chromePath of chromePaths) {
                if (fs.existsSync(chromePath)) {
                    executablePath = chromePath;
                    logger.info(`Using Chrome/Chromium at: ${chromePath}`);
                    break;
                }
            }

            this.client = new Client({
                authStrategy: new LocalAuth({
                    clientId: "whatsapp-api-client",
                    dataPath: path.resolve(sessionPath)
                }),
                puppeteer: {
                    headless: true,
                    executablePath: executablePath,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--disable-gpu'
                    ]
                }
            });

            this.setupEventHandlers();
            logger.info('WhatsApp client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            throw new Error('Client initialization failed');
        }
    }

    setupEventHandlers() {
        this.client.on('qr', async (qr) => {
            try {
                this.connectionStatus = 'connecting';
                this.qrCode = await QRCode.toDataURL(qr);
                logger.info('QR Code generated successfully');
                
                const qrTerminal = await QRCode.toString(qr, { type: 'terminal', small: true });
                logger.info('QR Code for terminal:', qrTerminal);
                console.log('\n=== WhatsApp QR Code ===');
                console.log('Scan this QR code with your WhatsApp:');
                console.log(qrTerminal);
                console.log('========================\n');
            } catch (error) {
                logger.error('Failed to generate QR code:', error);
            }
        });

        this.client.on('ready', () => {
            this.isReady = true;
            this.connectionStatus = 'authenticated';
            this.qrCode = null;
            console.log('✅ [EVENT] ready - WhatsApp client is ready and authenticated');
            logger.info('✅ WhatsApp client is ready and authenticated');
        });

        this.client.on('authenticated', () => {
            this.connectionStatus = 'connected';
            console.log('✅ [EVENT] authenticated - WhatsApp client authenticated');
            logger.info('WhatsApp client authenticated successfully');
        });

        this.client.on('loading_screen', (percent, message) => {
            console.log(`⏳ [EVENT] loading_screen - ${percent}% - ${message}`);
        });

        this.client.on('auth_failure', (msg) => {
            this.connectionStatus = 'disconnected';
            this.isReady = false;
            logger.error('❌ Authentication failed:', msg);
        });

        this.client.on('disconnected', (reason) => {
            this.connectionStatus = 'disconnected';
            this.isReady = false;
            this.qrCode = null;
            logger.warn('⚠️ WhatsApp client disconnected:', reason);
        });

        this.client.on('message', async (message) => {
            try {
                await this.handleIncomingMessage(message);
            } catch (error) {
                logger.error('Error handling incoming message:', error);
            }
        });

        this.client.on('error', (error) => {
            logger.error('WhatsApp client error:', error);
        });
    }

    async start() {
        try {
            // If client already exists and might be running, destroy it first
            if (this.client) {
                try {
                    logger.info('Destroying existing client before reconnecting...');
                    await this.client.destroy();
                } catch (destroyError) {
                    // Ignore destroy errors - client might not be fully initialized
                    logger.warn('Could not destroy existing client (may not be running):', destroyError.message);
                }
                this.isReady = false;
                this.connectionStatus = 'disconnected';
                this.qrCode = null;
                this.client = null;

                // Clean up lock files in case destroy failed or browser crashed
                const sessionPath = process.env.SESSION_PATH || './sessions';
                const clientSessionDir = path.resolve(sessionPath, 'session-whatsapp-api-client');
                this.cleanupStaleLocks(clientSessionDir);
            }

            // Reinitialize the client
            logger.info('Reinitializing WhatsApp client...');
            this.initializeClient();

            logger.info('Starting WhatsApp client...');
            await this.client.initialize();
            logger.info('WhatsApp client initialization completed');
        } catch (error) {
            logger.error('Failed to start WhatsApp client:', error);
            throw error;
        }
    }

    async getChats() {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            const chats = await this.client.getChats();
            return chats.map(chat => ({
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                lastMessage: chat.lastMessage ? {
                    id: chat.lastMessage.id._serialized,
                    body: chat.lastMessage.body,
                    timestamp: chat.lastMessage.timestamp
                } : null
            }));
        } catch (error) {
            logger.error('Failed to get chats:', error);
            throw error;
        }
    }

    async getChatInfo(chatId) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            const chat = await this.client.getChatById(chatId);
            if (!chat) {
                throw new Error(`Chat with ID ${chatId} not found`);
            }

            return {
                id: chat.id._serialized,
                name: chat.name,
                isGroup: chat.isGroup,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                archived: chat.archived,
                pinned: chat.pinned,
                isMuted: chat.isMuted,
                muteExpiration: chat.muteExpiration
            };
        } catch (error) {
            logger.error('Failed to get chat info:', error);
            throw error;
        }
    }

    async getMessages(chatId, limit = 50) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            const chat = await this.client.getChatById(chatId);
            if (!chat) {
                throw new Error(`Chat with ID ${chatId} not found`);
            }

            const messages = await chat.fetchMessages({ limit });
            return messages.map(message => ({
                id: message.id._serialized,
                from: message.from,
                to: message.to,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
                isGroupMsg: message.isGroupMsg,
                notifyName: message.notifyName,
                isMedia: message.isMedia,
                mediaType: message.mediaType,
                mimetype: message.mimetype,
                caption: message.caption,
                quotedMsg: message.quotedMsg ? {
                    id: message.quotedMsg.id._serialized,
                    from: message.quotedMsg.from,
                    body: message.quotedMsg.body,
                    timestamp: message.quotedMsg.timestamp,
                    type: message.quotedMsg.type,
                    isGroupMsg: message.quotedMsg.isGroupMsg,
                    notifyName: message.quotedMsg.notifyName,
                    isMedia: message.quotedMsg.isMedia,
                    mediaType: message.quotedMsg.mediaType,
                    mimetype: message.quotedMsg.mimetype,
                    caption: message.quotedMsg.caption,     
            } : null
            }));
        } catch (error) {
            logger.error('Failed to get messages:', error);
            throw error;
        }
   }

    async stop() {
        try {
            if (this.client) {
                await this.client.destroy();
                this.isReady = false;
                this.connectionStatus = 'disconnected';
                this.qrCode = null;
                logger.info('WhatsApp client stopped successfully');
            }
        } catch (error) {
            logger.error('Failed to stop WhatsApp client:', error);
            throw error;
        }
    }

    async sendMessage(phoneNumber, message, countryCode = '972') {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            if (!validatePhoneNumber(phoneNumber)) {
                throw new Error('Invalid phone number format');
            }

            if (!message || message.trim().length === 0) {
                throw new Error('Message cannot be empty');
            }

            const formattedNumber = formatPhoneNumber(phoneNumber, countryCode);
            
            const numberId = await this.client.getNumberId(formattedNumber);
            if (!numberId) {
                throw new Error(`Phone number ${phoneNumber} is not registered on WhatsApp`);
            }

            let result;
            try {
                result = await this.client.sendMessage(numberId._serialized, message);
            } catch (sendError) {
                // Handle known whatsapp-web.js bug: markedUnread error
                // The message is often delivered even when this error occurs
                if (sendError.message && sendError.message.includes('markedUnread')) {
                    logger.warn(`⚠️ markedUnread bug encountered - message likely sent to ${formattedNumber}`);
                    return {
                        success: true,
                        messageId: `pending-${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000),
                        to: formattedNumber,
                        originalNumber: phoneNumber,
                        message: message,
                        countryCode: countryCode,
                        note: 'Message likely delivered (markedUnread bug workaround)'
                    };
                }
                throw sendError;
            }

            logger.info(`✅ Message sent successfully to ${formattedNumber}`, {
                messageId: result.id.id,
                timestamp: result.timestamp,
                to: phoneNumber
            });

            return {
                success: true,
                messageId: result.id.id,
                timestamp: result.timestamp,
                to: formattedNumber,
                originalNumber: phoneNumber,
                message: message,
                countryCode: countryCode
            };

        } catch (error) {
            logger.error('❌ Failed to send message:', error);
            return {
                success: false,
                error: error.message,
                to: phoneNumber,
                message: message
            };
        }
    }

    async sendToChat(chatId, message) {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            if (!message || message.trim().length === 0) {
                throw new Error('Message cannot be empty');
            }

            let result;
            try {
                result = await this.client.sendMessage(chatId, message);
            } catch (sendError) {
                // Handle known whatsapp-web.js bug: markedUnread error
                if (sendError.message && sendError.message.includes('markedUnread')) {
                    logger.warn(`⚠️ markedUnread bug encountered - message likely sent to chat ${chatId}`);
                    return {
                        success: true,
                        messageId: `pending-${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000),
                        to: chatId,
                        message: message,
                        note: 'Message likely delivered (markedUnread bug workaround)'
                    };
                }
                throw sendError;
            }

            logger.info(`✅ Message sent successfully to chat ${chatId}`, {
                messageId: result.id.id,
                timestamp: result.timestamp
            });

            return {
                success: true,
                messageId: result.id.id,
                timestamp: result.timestamp,
                to: chatId,
                message: message
            };

        } catch (error) {
            logger.error('❌ Failed to send message to chat:', error);
            return {
                success: false,
                error: error.message,
                to: chatId,
                message: message
            };
        }
    }

    async sendMedia(chatId, mediaBase64, mimetype, filename, caption = '') {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready. Please authenticate first.');
            }

            // Create MessageMedia from base64
            const media = new MessageMedia(mimetype, mediaBase64, filename);

            const result = await this.client.sendMessage(chatId, media, {
                caption: caption
            });

            logger.info(`✅ Media sent successfully to chat ${chatId}`, {
                messageId: result.id.id,
                timestamp: result.timestamp,
                filename: filename
            });

            return {
                success: true,
                messageId: result.id.id,
                timestamp: result.timestamp,
                to: chatId,
                filename: filename
            };

        } catch (error) {
            logger.error('❌ Failed to send media:', error);
            return {
                success: false,
                error: error.message,
                to: chatId
            };
        }
    }

    async replyToMessage(messageId, replyMessage) {
        try {
            var originalMessageId = messageId;
            // chack if the messageId includes this format :"<fasle/true>_<chatId>_<messageId>" then extract the real messageId
            if( messageId.includes('_')) {
                const parts = messageId.split('_');
                messageId = parts[parts.length - 1];
            }
            const message = await this.client.getMessageById(originalMessageId);
            await message.reply(replyMessage);
            const update = db.prepare(`UPDATE messages SET processed = 1 WHERE id = ?`);
            update.run(messageId);
            logger.info(`✅ Reply sent successfully to message ${messageId}`, {
                replyMessage: replyMessage
            });
            return {
                success: true,
                message: 'Reply sent successfully'
            };
        } catch (error) {
            logger.error('❌ Failed to reply to message:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    async handleIncomingMessage(message) {
        try {
            console.log('Received message:', message);
            const messageData = {
                id: message.id.id,
                from: message.from,
                to: message.to,
                body: message.body,
                timestamp: message.timestamp,
                type: message.type,
                isGroupMsg: message.isGroupMsg,
                author: message.author,
                notifyName: message.notifyName,
                fromMe: message.fromMe
            };
            try {
                const insert = db.prepare(`
                    INSERT OR REPLACE INTO messages (id, fromNumber, toNumber, body, timestamp, type, isGroupMsg, processed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
                `);

                insert.run(
                    messageData.id,
                    messageData.from,
                    messageData.to,
                    messageData.body,
                    messageData.timestamp,
                    messageData.type,
                    messageData.isGroupMsg ? 1 : 0
                );
            } catch (dbErr) {
                logger.error('❌ Failed to save message to DB:', dbErr);
            }

            if (!message.fromMe) {
                logger.info('📨 Incoming message received', {
                    from: message.from,
                    type: message.type,
                    preview: message.body?.substring(0, 50) + (message.body?.length > 50 ? '...' : ''),
                    isGroup: message.isGroupMsg
                });
            }

            // Send webhook notification if configured
            if (process.env.WEBHOOK_URL) {
                try {
                    const webhookPayload = {
                        event: 'message',
                        payload: {
                            id: message.id._serialized,
                            from: message.from,
                            to: message.to,
                            body: message.body,
                            timestamp: message.timestamp,
                            fromMe: message.fromMe,
                            isGroupMsg: message.from.includes('@g.us'),
                            author: message.author,
                            notifyName: message.notifyName,
                            type: message.type
                        }
                    };

                    await axios.post(process.env.WEBHOOK_URL, webhookPayload, {
                        timeout: 5000,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    logger.info('📤 Webhook sent successfully', {
                        url: process.env.WEBHOOK_URL,
                        messageId: message.id.id,
                        fromMe: message.fromMe
                    });
                } catch (webhookError) {
                    logger.error('❌ Failed to send webhook:', {
                        url: process.env.WEBHOOK_URL,
                        error: webhookError.message
                    });
                }
            }

            for (const handler of this.messageHandlers) {
                try {
                    await handler(messageData, message);
                } catch (handlerError) {
                    logger.error('Message handler error:', handlerError);
                }
            }

        } catch (error) {
            logger.error('Error processing incoming message:', error);
        }
    }

    addMessageHandler(handler) {
        if (typeof handler === 'function') {
            this.messageHandlers.push(handler);
            logger.info('Message handler registered');
        } else {
            throw new Error('Handler must be a function');
        }
    }

    getStatus() {
        return {
            isReady: this.isReady,
            connectionStatus: this.connectionStatus,
            hasQrCode: !!this.qrCode,
            handlersCount: this.messageHandlers.length,
            timestamp: new Date().toISOString()
        };
    }

    getQrCode() {
        return this.qrCode;
    }

    async getClientInfo() {
        try {
            if (!this.isReady) {
                return null;
            }
            
            const info = this.client.info;
            return {
                phoneNumber: info.wid.user,
                platform: info.platform,
                pushname: info.pushname,
                connected: this.isReady,
                lastSeen: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Failed to get client info:', error);
            return null;
        }
    }

    async isRegisteredNumber(phoneNumber, countryCode = '972') {
        try {
            if (!this.isReady) {
                throw new Error('WhatsApp client is not ready');
            }

            const formattedNumber = formatPhoneNumber(phoneNumber, countryCode);
            const numberId = await this.client.getNumberId(formattedNumber);
            
            return !!numberId;
        } catch (error) {
            logger.error('Error checking number registration:', error);
            return false;
        }
    }
}

module.exports = WhatsAppService;
