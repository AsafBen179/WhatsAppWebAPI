/**
 * WhatsApp API Server with PM2 Support
 * Main entry point for the application
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false // Allow inline scripts for QR display
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

        // Rate limiting
        const limiter = rateLimit({
            windowMs: (process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
            max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
            message: {
                success: false,
                error: 'Too many requests, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api', limiter);

        // Body parsing middleware
        this.app.use(express.json({ 
            limit: `${process.env.MAX_FILE_SIZE_MB || 10}mb` 
        }));
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: `${process.env.MAX_FILE_SIZE_MB || 10}mb` 
        }));

        // Request logging
        this.app.use(logger.addRequestId);
        this.app.use(logger.httpLogger);

        // API key authentication middleware
        this.app.use('/api', this.authenticateRequest.bind(this));
    }
    /**
     * Simple API key authentication
     */
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

    /**
     * Setup API routes
     */
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
        this.app.get('/api/messages/unprocessed', this.getUnprocessedMessages.bind(this));

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
    /**
     * API Documentation endpoint
     */
    getAPIDocumentation(req, res) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const documentation = {
            name: 'WhatsApp API Server',
            version: require('./package.json').version,
            description: 'REST API for WhatsApp automation using whatsapp-web.js with PM2 support',
            baseUrl: baseUrl,
            environment: process.env.NODE_ENV,
            pm2: {
                status: 'PM2 managed process',
                appName: process.env.PM2_APP_NAME || 'whatsapp-api'
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
                },
                sendMedia: {
                    method: 'POST',
                    path: '/api/send-media',
                    description: 'Send a media message',
                    body: {
                        phoneNumber: 'string (required)',
                        mediaPath: 'string (required) - Path to media file',
                        caption: 'string (optional)',
                        countryCode: 'string (optional)'
                    }
                }
            },
            authentication: {
                type: 'API Key',
                header: 'x-api-key',
                description: 'Set API_KEY environment variable to enable authentication'
            },
            pm2Commands: {
                status: 'pm2 status',
                logs: 'pm2 logs whatsapp-api',
                restart: 'pm2 restart whatsapp-api',
                stop: 'pm2 stop whatsapp-api'
            }
        };

        res.json(documentation);
    }
    /**
     * Health check endpoint
     */
    async getHealth(req, res) {
        try {
            const status = this.whatsappService ? this.whatsappService.getStatus() : { isReady: false };
            
            res.json({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV,
                pm2: {
                    managed: !!process.env.PM2_USAGE,
                    instanceId: process.env.NODE_APP_INSTANCE || 0
                },
                whatsapp: status,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: require('./package.json').version,
                node: process.version
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Health check failed'
            });
        }
    }

    /**
     * Get QR code for WhatsApp authentication
     */
    async getQRCode(req, res) {
        try {
            if (!this.whatsappService) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not initialized. Call /api/connect first.'
                });
            }

            const qrCode = this.whatsappService.getQrCode();
            
            if (!qrCode) {
                return res.json({
                    success: true,
                    qrCode: null,
                    message: 'No QR code available. Client may already be authenticated or initializing.'
                });
            }

            res.json({
                success: true,
                qrCode: qrCode,
                message: 'Scan this QR code with your WhatsApp mobile app',
                instructions: [
                    '1. Open WhatsApp on your phone',
                    '2. Go to Settings > Linked Devices',
                    '3. Tap "Link a Device"',
                    '4. Scan this QR code'
                ]
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to get QR code'
            });
        }
    }
    /**
     * Get WhatsApp connection status
     */
    async getStatus(req, res) {
        try {
            if (!this.whatsappService) {
                return res.json({
                    success: true,
                    status: {
                        isReady: false,
                        connectionStatus: 'not_initialized',
                        message: 'WhatsApp service not initialized. Call /api/connect to start.'
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

    /**
     * Initialize WhatsApp connection
     */
    async connect(req, res) {
        try {
            if (this.whatsappService && this.whatsappService.isReady) {
                return res.json({
                    success: true,
                    message: 'WhatsApp is already connected and ready'
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
                ]
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to connect to WhatsApp: ' + error.message
            });
        }
    }

    /**
     * Disconnect from WhatsApp
     */
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
                message: 'WhatsApp disconnected successfully'
            });
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to disconnect from WhatsApp'
            });
        }
    }
    /**
     * Send a text message
     */
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
                    help: 'Call POST /api/connect to initialize the connection'
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
                res.json(result);
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

    /**
     * Send a media message
     */
    async sendMediaMessage(req, res) {
        try {
            const { phoneNumber, mediaPath, caption, countryCode } = req.body;

            if (!phoneNumber || !mediaPath) {
                return res.status(400).json({
                    success: false,
                    error: 'Phone number and media path are required'
                });
            }

            if (!this.whatsappService || !this.whatsappService.isReady) {
                return res.status(400).json({
                    success: false,
                    error: 'WhatsApp service not ready. Please connect first.'
                });
            }

            const result = await this.whatsappService.sendMediaMessage(
                phoneNumber, 
                mediaPath, 
                caption || '', 
                countryCode || '972'
            );

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            logger.apiError(error, req);
            res.status(500).json({
                success: false,
                error: 'Failed to send media message'
            });
        }
    }
    /**
     * Check if phone number is registered on WhatsApp
     */
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

    /**
     * Get client information
     */
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

    /**
     * Handle incoming webhooks
     */
    async handleWebhook(req, res) {
        try {
            const { phoneNumber, message, countryCode, webhook_token } = req.body;

            // Verify webhook token if configured
            const expectedToken = process.env.WEBHOOK_TOKEN;
            if (expectedToken && expectedToken !== 'your-webhook-token-change-this') {
                if (webhook_token !== expectedToken) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid webhook token'
                    });
                }
            }

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

    /**
     * Setup default auto-responders
     */
    setupDefaultAutoResponders() {
        if (!this.messageHandler) return;

        try {
            // Hebrew welcome message
            this.messageHandler.addAutoResponder(
                /^(שלום|היי|הלו|hello|hi)$/i,
                'שלום! תודה שפניתם אלינו. איך אני יכול לעזור לכם היום?',
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

            // Business hours responder in Hebrew
            this.messageHandler.addAutoResponder(
                /^(שעות פעילות|שעות עבודה|מתי פתוח)$/i,
                'שעות הפעילות שלנו: ראשון-חמישי 9:00-18:00. אנו נחזור אליכם במהלך שעות הפעילות!',
                { id: 'business_hours_hebrew', enabled: true }
            );

            logger.info('Default Hebrew auto-responders configured');
        } catch (error) {
            logger.error('Error setting up default auto-responders:', error);
        }
    }
    /**
     * Setup error handling middleware
     */
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
            // Don't exit in production when using PM2
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

        // PM2 specific signals
        process.on('message', (msg) => {
            if (msg === 'shutdown') {
                logger.info('PM2 shutdown message received');
                this.shutdown();
            }
        });
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            logger.info('Starting graceful shutdown...');
            
            // Stop WhatsApp service
            if (this.whatsappService) {
                await this.whatsappService.stop();
                logger.info('WhatsApp service stopped');
            }
            
            // Close server
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                    process.exit(0);
                });

                // Force close after timeout
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

    /**
     * Start the server
     */
    async start() {
        try {
            this.server = this.app.listen(this.port, () => {
                logger.info(`WhatsApp API Server started on port ${this.port}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`PM2 managed: ${!!process.env.PM2_USAGE}`);
                logger.info(`API Documentation: http://localhost:${this.port}/`);
                logger.info(`Health check: http://localhost:${this.port}/api/health`);
                
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
                    }, 5000); // Wait 5 seconds for server to fully start
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

            // PM2 ready signal
            if (process.send) {
                process.send('ready');
            }

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
