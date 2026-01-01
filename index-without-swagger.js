/**
 * WhatsApp API Server - Complete Version
 * גרסה מלאה עם כל הפונקציות
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Import our modules
const WhatsAppService = require('./src/whatsappService');
const MessageHandler = require('./src/messageHandler');
const logger = require('./src/utils/logger');
const { validateSendMessageParams, sanitizeInput } = require('./src/utils/validator');

class WhatsAppAPIServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.whatsappService = null;
        this.messageHandler = null;
        this.server = null;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false
        }));

        // CORS configuration
        const corsOptions = {
            origin: process.env.ALLOWED_ORIGINS ? 
                process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : 
                ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
        };
        this.app.use(cors(corsOptions));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use(logger.addRequestId);
        this.app.use(logger.httpLogger);

        // API key authentication middleware
        this.app.use('/api', this.authenticateRequest.bind(this));
    }

    authenticateRequest(req, res, next) {
        // Skip auth for health check and public endpoints
        const publicEndpoints = ['/health', '/qr', '/status'];
        if (publicEndpoints.includes(req.path)) {
            return next();
        }

        const apiKey = req.headers['x-api-key'] || req.query.apiKey;
        const expectedApiKey = process.env.API_KEY;

        // If no API key is configured, skip authentication
        if (!expectedApiKey || expectedApiKey === 'your-secure-api-key-change-this-in-production') {
            logger.warn('API key not configured - authentication disabled');
            return next();
        }

        if (!apiKey || apiKey !== expectedApiKey) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or missing API key'
            });
        }

        next();
    }

    setupRoutes() {
        // Root endpoint with API documentation
        this.app.get('/', this.getAPIDocumentation.bind(this));

        // Health check endpoint
        this.app.get('/api/health', this.getHealth.bind(this));

        // WhatsApp connection endpoints
        this.app.get('/api/qr', this.getQRCode.bind(this));
        this.app.get('/api/status', this.getStatus.bind(this));
        this.app.post('/api/connect', this.connect.bind(this));
        this.app.post('/api/disconnect', this.disconnect.bind(this));

        // Message endpoints
        this.app.post('/api/send', this.sendMessage.bind(this));
        this.app.post('/api/send-media', this.sendMediaMessage.bind(this));
        this.app.get('/api/messages', this.getMessages.bind(this));
        this.app.get('/api/messages/stats', this.getMessageStats.bind(this));

        // Auto-responder endpoints
        this.app.post('/api/auto-responders', this.addAutoResponder.bind(this));
        this.app.get('/api/auto-responders', this.getAutoResponders.bind(this));
        this.app.delete('/api/auto-responders/:id', this.removeAutoResponder.bind(this));
        this.app.put('/api/auto-responders/:id/toggle', this.toggleAutoResponder.bind(this));

        // Utility endpoints
        this.app.post('/api/check-number', this.checkNumber.bind(this));
        this.app.get('/api/client-info', this.getClientInfo.bind(this));
        this.app.post('/api/webhook', this.handleWebhook.bind(this));
    }
    // API Documentation endpoint
    getAPIDocumentation(req, res) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const documentation = {
            name: 'WhatsApp API Server',
            version: require('./package.json').version,
            description: 'REST API for WhatsApp automation using whatsapp-web.js with PM2 support',
            baseUrl: baseUrl,
            environment: process.env.NODE_ENV,
            hebrew: {
                name: 'שרת API וואטסאפ',
                description: 'API לאוטומציה של וואטסאפ עם תמיכה בעברית'
            },
            endpoints: {
                health: {
                    method: 'GET',
                    path: '/api/health',
                    description: 'Check API health and status'
                },
                qr: {
                    method: 'GET',
                    path: '/api/qr',
                    description: 'Get QR code for WhatsApp authentication'
                },
                status: {
                    method: 'GET',
                    path: '/api/status',
                    description: 'Get WhatsApp connection status'
                },
                connect: {
                    method: 'POST',
                    path: '/api/connect',
                    description: 'Initialize WhatsApp connection'
                },
                sendMessage: {
                    method: 'POST',
                    path: '/api/send',
                    description: 'Send a text message',
                    body: {
                        phoneNumber: 'string (required) - Phone number without country code',
                        message: 'string (required) - Message text',
                        countryCode: 'string (optional, default: "972") - Country code'
                    }
                }
            }
        };

        res.json(documentation);
    }

    // Health check endpoint
    async getHealth(req, res) {
        try {
            const status = this.whatsappService ? this.whatsappService.getStatus() : { isReady: false };
            
            res.json({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                whatsapp: status,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: require('./package.json').version,
                node: process.version,
                hebrew: {
                    status: 'בריא',
                    message: 'השרת פועל תקין'
                }
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Health check failed'
            });
        }
    }

    // Get QR code for WhatsApp authentication
    async getQRCode(req, res) {
        try {
            if (!this.whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not initialized. Call /api/connect first.'
                });
            }

            const qrCode = this.whatsappService.getQrCode();
            
            res.json({
                success: true,
                qrCode: qrCode,
                message: qrCode ? 'Scan this QR code with your WhatsApp mobile app' : 'No QR code available',
                hebrew: {
                    message: qrCode ? 'סרוק קוד זה עם אפליקציית וואטסאפ' : 'אין קוד QR זמין',
                    instructions: qrCode ? [
                        'פתח את וואטסאפ בטלפון',
                        'לך להגדרות > מכשירים מקושרים',
                        'לחץ על "קשר מכשיר"',
                        'סרוק את הקוד'
                    ] : []
                }
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get QR code'
            });
        }
    }

    // Get WhatsApp connection status
    async getStatus(req, res) {
        try {
            if (!this.whatsappService) {
                return res.json({
                    success: true,
                    status: {
                        isReady: false,
                        connectionStatus: 'not_initialized',
                        message: 'WhatsApp service not initialized. Call /api/connect to start.'
                    },
                    hebrew: {
                        status: 'לא מחובר',
                        message: 'שירות וואטסאפ לא הופעל'
                    }
                });
            }

            const status = this.whatsappService.getStatus();
            const clientInfo = await this.whatsappService.getClientInfo();

            res.json({
                success: true,
                status: {
                    ...status,
                    clientInfo,
                    lastUpdate: new Date().toISOString()
                },
                hebrew: {
                    status: status.isReady ? 'מחובר ומוכן' : 'לא מוכן',
                    message: status.isReady ? 'מוכן לשליחת הודעות' : 'עדיין לא מוכן'
                }
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get status'
            });
        }
    }

    // Initialize WhatsApp connection
    async connect(req, res) {
        try {
            if (this.whatsappService && this.whatsappService.isReady) {
                return res.json({
                    success: true,
                    message: 'WhatsApp is already connected and ready',
                    hebrew: {
                        message: 'וואטסאפ כבר מחובר ומוכן'
                    }
                });
            }

            // Initialize services if not already done
            if (!this.whatsappService) {
                logger.info('Initializing WhatsApp service...');
                this.whatsappService = new WhatsAppService();
                this.messageHandler = new MessageHandler(this.whatsappService);
                
                // Add default auto-responders
                this.setupDefaultAutoResponders();
            }

            await this.whatsappService.start();

            res.json({
                success: true,
                message: 'WhatsApp connection initiated successfully. Please scan QR code if prompted.',
                nextSteps: [
                    'Check QR code: GET /api/qr',
                    'Monitor status: GET /api/status',
                    'Start sending messages once authenticated'
                ],
                hebrew: {
                    message: 'התחברות לוואטסאפ החלה בהצלחה',
                    nextSteps: [
                        'בדוק קוד QR: GET /api/qr',
                        'עקוב אחר הסטטוס: GET /api/status',
                        'התחל לשלוח הודעות לאחר האימות'
                    ]
                }
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to connect to WhatsApp: ' + error.message
            });
        }
    }

    // Disconnect from WhatsApp
    async disconnect(req, res) {
        try {
            if (!this.whatsappService) {
                return res.json({
                    success: true,
                    message: 'WhatsApp service was not initialized'
                });
            }

            await this.whatsappService.stop();

            res.json({
                success: true,
                message: 'WhatsApp disconnected successfully',
                hebrew: {
                    message: 'וואטסאפ נותק בהצלחה'
                }
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to disconnect from WhatsApp'
            });
        }
    }

    // Send a text message
    async sendMessage(req, res) {
        try {
            const { phoneNumber, message, countryCode } = req.body;

            // Validate input
            const validation = validateSendMessageParams({ phoneNumber, message, countryCode });
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    errors: validation.errors
                });
            }

            if (!this.whatsappService || !this.whatsappService.isReady) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not ready. Please connect first.',
                    help: 'Call POST /api/connect to initialize the connection',
                    hebrew: {
                        error: 'שירות וואטסאפ לא מוכן. אנא התחבר תחילה.'
                    }
                });
            }

            // Sanitize message content
            const sanitizedMessage = sanitizeInput(message, { maxLength: 4096 });

            // Use Israeli country code as default
            const defaultCountryCode = countryCode || '972';
            
            const result = await this.whatsappService.sendMessage(
                phoneNumber, 
                sanitizedMessage, 
                defaultCountryCode
            );

            if (result.success) {
                logger.info(`Message sent successfully to ${phoneNumber}`);
                res.json({
                    ...result,
                    hebrew: {
                        status: 'נשלח בהצלחה'
                    }
                });
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to send message'
            });
        }
    }

    // Send a media message (placeholder)
    async sendMediaMessage(req, res) {
        res.status(501).json({
            success: false,
            error: 'Media messages not implemented yet',
            hebrew: {
                error: 'שליחת מדיה עדיין לא מיושמת'
            }
        });
    }

    // Get messages
    async getMessages(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const limit = parseInt(req.query.limit) || 50;
            const messages = this.messageHandler.getRecentMessages(limit);

            res.json({
                success: true,
                count: messages.length,
                messages: messages
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get messages'
            });
        }
    }

    // Get message statistics
    async getMessageStats(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const stats = this.messageHandler.getMessageStats();

            res.json({
                success: true,
                stats: stats
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get message statistics'
            });
        }
    }

    // Add auto-responder
    async addAutoResponder(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const { trigger, response, options } = req.body;

            if (!trigger || !response) {
                return res.status(400).json({
                    success: false,
                    error: 'Trigger and response are required'
                });
            }

            // Convert string regex to RegExp if needed
            let parsedTrigger = trigger;
            if (typeof trigger === 'string' && trigger.startsWith('/') && trigger.includes('/')) {
                try {
                    const regexMatch = trigger.match(/^\/(.+)\/([gimuy]*)$/);
                    if (regexMatch) {
                        parsedTrigger = new RegExp(regexMatch[1], regexMatch[2]);
                    }
                } catch (error) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid regex pattern'
                    });
                }
            }

            const responderId = this.messageHandler.addAutoResponder(parsedTrigger, response, options || {});

            res.json({
                success: true,
                responderId: responderId,
                message: 'Auto-responder added successfully'
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to add auto-responder'
            });
        }
    }

    // Get auto-responders
    async getAutoResponders(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const responders = this.messageHandler.getAutoResponders();

            res.json({
                success: true,
                count: responders.length,
                autoResponders: responders
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get auto-responders'
            });
        }
    }

    // Remove auto-responder
    async removeAutoResponder(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Responder ID is required'
                });
            }

            const removed = this.messageHandler.removeAutoResponder(id);

            if (removed) {
                res.json({
                    success: true,
                    message: 'Auto-responder removed successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Auto-responder not found'
                });
            }
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to remove auto-responder'
            });
        }
    }

    // Toggle auto-responder
    async toggleAutoResponder(req, res) {
        try {
            if (!this.messageHandler) {
                return res.status(400).json({
                    success: false,
                    error: 'Message handler not initialized'
                });
            }

            const { id } = req.params;
            const { enabled } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'Responder ID is required'
                });
            }

            if (typeof enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Enabled must be a boolean value'
                });
            }

            const toggled = this.messageHandler.toggleAutoResponder(id, enabled);

            if (toggled) {
                res.json({
                    success: true,
                    message: `Auto-responder ${enabled ? 'enabled' : 'disabled'} successfully`
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: 'Auto-responder not found'
                });
            }
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to toggle auto-responder'
            });
        }
    }

    // Check if phone number is registered on WhatsApp
    async checkNumber(req, res) {
        try {
            const { phoneNumber, countryCode } = req.body;

            if (!phoneNumber) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number is required'
                });
            }

            if (!this.whatsappService || !this.whatsappService.isReady) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not ready'
                });
            }

            const isRegistered = await this.whatsappService.isRegisteredNumber(
                phoneNumber, 
                countryCode || '972'
            );

            res.json({
                success: true,
                phoneNumber: phoneNumber,
                isRegistered: isRegistered,
                countryCode: countryCode || '972'
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to check phone number'
            });
        }
    }

    // Get client information
    async getClientInfo(req, res) {
        try {
            if (!this.whatsappService || !this.whatsappService.isReady) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not ready'
                });
            }

            const clientInfo = await this.whatsappService.getClientInfo();

            res.json({
                success: true,
                clientInfo: clientInfo
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get client information'
            });
        }
    }

    // Handle incoming webhooks
    async handleWebhook(req, res) {
        try {
            const { phoneNumber, message, countryCode, webhook_token } = req.body;

            if (!phoneNumber || !message) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number and message are required'
                });
            }

            if (!this.whatsappService || !this.whatsappService.isReady) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not ready'
                });
            }

            const result = await this.whatsappService.sendMessage(
                phoneNumber, 
                message, 
                countryCode || '972'
            );

            res.json(result);
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Webhook processing failed'
            });
        }
    }

    // Setup default auto-responders
    setupDefaultAutoResponders() {
        if (!this.messageHandler) return;

        try {
            // Hebrew welcome message
            this.messageHandler.addAutoResponder(
                /^(שלום|היי|הלו|hello|hi)$/i,
                'שלום! תודה שפניתם אלינו. איך אני יכול לעזור לכם היום? 😊',
                { id: 'welcome_hebrew', enabled: true }
            );

            // Help command in Hebrew
            this.messageHandler.addAutoResponder(
                /^(עזרה|help|\/help)$/i,
                'פקודות זמינות:\n- הקלידו "שלום" לברכה\n- הקלידו "סטטוס" לבדיקת מצב\n- הקלידו "מידע" למידע נוסף',
                { id: 'help_command_hebrew', enabled: true }
            );

            // Status command in Hebrew
            this.messageHandler.addAutoResponder(
                /^(סטטוס|status|\/status)$/i,
                () => {
                    const uptime = Math.floor(process.uptime());
                    const minutes = Math.floor(uptime / 60);
                    const hours = Math.floor(minutes / 60);
                    return `סטטוס הבוט: פעיל ✅\nזמן פעילות: ${hours} שעות ו-${minutes % 60} דקות\nזמן: ${new Date().toLocaleString('he-IL')}`;
                },
                { id: 'status_command_hebrew', enabled: true }
            );

            logger.info('Default Hebrew auto-responders configured');
        } catch (error) {
            logger.error('Error setting up default auto-responders:', error);
        }
    }

    // Setup error handling middleware
    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.originalUrl,
                availableEndpoints: [
                    'GET /',
                    'GET /api/health',
                    'GET /api/status',
                    'POST /api/connect',
                    'GET /api/qr',
                    'POST /api/send'
                ]
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            logger.apiError(error, req);
            
            const isDevelopment = process.env.NODE_ENV !== 'production';
            
            res.status(500).json({
                success: false,
                error: isDevelopment ? error.message : 'Internal server error',
                ...(isDevelopment && { stack: error.stack }),
                timestamp: new Date().toISOString()
            });
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', { promise, reason });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            if (!process.env.PM2_USAGE) {
                process.exit(1);
            }
        });

        // Graceful shutdown signals
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
    }

    // Graceful shutdown
    async shutdown() {
        try {
            logger.info('Starting graceful shutdown...');
            
            if (this.whatsappService) {
                await this.whatsappService.stop();
                logger.info('WhatsApp service stopped');
            }
            
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                    process.exit(0);
                });

                setTimeout(() => {
                    logger.warn('Forced shutdown after timeout');
                    process.exit(1);
                }, 10000);
            } else {
                process.exit(0);
            }
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    // Start the server
    async start() {
        try {
            this.server = this.app.listen(this.port, () => {
                logger.info(`🚀 WhatsApp API Server started on port ${this.port}`);
                logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`📱 Hebrew support: Enabled`);
                logger.info(`📖 API Documentation: http://localhost:${this.port}/`);
                logger.info(`💚 Health check: http://localhost:${this.port}/api/health`);
                
                console.log('\n📋 Quick Start (Hebrew):');
                console.log('1. בדוק בריאות: GET http://localhost:' + this.port + '/api/health');
                console.log('2. התחבר לוואטסאפ: POST http://localhost:' + this.port + '/api/connect');
                console.log('3. קבל QR: GET http://localhost:' + this.port + '/api/qr');
                console.log('4. שלח הודעה: POST http://localhost:' + this.port + '/api/send');
                console.log('\n✅ השרת מוכן לשימוש!');
                
                // Auto-connect if configured
                if (process.env.AUTO_CONNECT === 'true') {
                    logger.info('Auto-connecting to WhatsApp...');
                    setTimeout(async () => {
                        try {
                            if (!this.whatsappService) {
                                this.whatsappService = new WhatsAppService();
                                this.messageHandler = new MessageHandler(this.whatsappService);
                                this.setupDefaultAutoResponders();
                            }
                            await this.whatsappService.start();
                            logger.info('Auto-connect completed');
                        } catch (error) {
                            logger.error('Auto-connect failed:', error);
                        }
                    }, 5000);
                }
            });

            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger.error(`Port ${this.port} is already in use`);
                } else {
                    logger.error('Server error:', error);
                }
                process.exit(1);
            });

        } catch (error) {
            logger.error('Failed to start server:', error);
            throw error;
        }
    }
}

// Create and start the server
const server = new WhatsAppAPIServer();

// Start the server
server.start().catch((error) => {
    logger.error('Failed to start WhatsApp API Server:', error);
    process.exit(1);
});

// Export for testing
module.exports = { WhatsAppAPIServer, server };
