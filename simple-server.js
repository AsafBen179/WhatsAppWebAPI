/**
 * Simple WhatsApp API Server - Basic Version
 * גרסה פשוטה לבדיקה ראשונית
 */

const express = require('express');

// Check if whatsapp-web.js is available
let Client, LocalAuth, QRCode;
try {
    const whatsappWeb = require('whatsapp-web.js');
    Client = whatsappWeb.Client;
    LocalAuth = whatsappWeb.LocalAuth;
    QRCode = require('qrcode');
    console.log('✅ WhatsApp Web.js loaded successfully');
} catch (error) {
    console.error('❌ Error loading WhatsApp Web.js:', error.message);
    console.log('💡 Run: npm install whatsapp-web.js qrcode');
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global variables
let client = null;
let qrCodeData = null;
let isReady = false;

// Simple logging
function log(message, data = null) {
    const timestamp = new Date().toLocaleString('he-IL');
    console.log(`[${timestamp}] ${message}`);
    if (data) console.log(data);
}

// Routes
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp API - Simple Version',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            connect: 'POST /api/connect',
            qr: '/api/qr',
            status: '/api/status',
            send: 'POST /api/send'
        },
        hebrew: {
            name: 'API וואטסאפ - גרסה פשוטה',
            message: 'השרת פועל בהצלחה! 🚀'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            node: process.version
        },
        whatsapp: {
            available: !!Client,
            isReady: isReady,
            hasQR: !!qrCodeData
        },
        hebrew: {
            status: 'בריא',
            message: 'השרת עובד תקין'
        }
    });
});

app.post('/api/connect', async (req, res) => {
    try {
        if (!Client) {
            return res.status(500).json({
                success: false,
                error: 'WhatsApp client not available',
                hebrew: {
                    error: 'לקוח וואטסאפ לא זמין'
                }
            });
        }

        if (isReady) {
            return res.json({
                success: true,
                message: 'Already connected to WhatsApp',
                hebrew: {
                    message: 'כבר מחובר לוואטסאפ'
                }
            });
        }

        if (!client) {
            log('🔌 Initializing WhatsApp client...');
            
            client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: './sessions'
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            client.on('qr', async (qr) => {
                try {
                    log('📱 QR Code received, generating image...');
                    qrCodeData = await QRCode.toDataURL(qr);
                    log('✅ QR Code ready!');
                    
                    // Also show QR in terminal
                    const qrTerminal = await QRCode.toString(qr, { type: 'terminal' });
                    console.log('\n=== QR Code לסריקה ===');
                    console.log(qrTerminal);
                    console.log('========================\n');
                } catch (error) {
                    log('❌ QR Code generation failed:', error);
                }
            });

            client.on('ready', () => {
                isReady = true;
                qrCodeData = null;
                log('✅ WhatsApp client is ready!');
            });

            client.on('authenticated', () => {
                log('🔐 WhatsApp authenticated');
            });

            client.on('auth_failure', (msg) => {
                log('❌ Authentication failed:', msg);
            });

            client.on('disconnected', (reason) => {
                isReady = false;
                log('⚠️ WhatsApp disconnected:', reason);
            });

            client.on('message', (message) => {
                if (!message.fromMe) {
                    log(`📨 Message from ${message.from}: ${message.body?.substring(0, 50)}...`);
                }
            });

            await client.initialize();
        }

        res.json({
            success: true,
            message: 'WhatsApp connection initiated',
            hebrew: {
                message: 'התחברות לוואטסאפ החלה'
            }
        });

    } catch (error) {
        log('❌ Connection error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            hebrew: {
                error: 'שגיאה בהתחברות'
            }
        });
    }
});

app.get('/api/qr', (req, res) => {
    res.json({
        success: true,
        qrCode: qrCodeData,
        message: qrCodeData ? 'QR Code available' : 'No QR code available',
        hebrew: {
            message: qrCodeData ? 'קוד QR זמין' : 'אין קוד QR זמין',
            instructions: qrCodeData ? [
                'פתח את וואטסאפ בטלפון',
                'לך להגדרות > מכשירים מקושרים',
                'לחץ על "קשר מכשיר"',
                'סרוק את הקוד'
            ] : []
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        status: {
            isReady: isReady,
            hasQR: !!qrCodeData,
            connectionStatus: isReady ? 'authenticated' : (qrCodeData ? 'waiting_for_scan' : 'initializing')
        },
        hebrew: {
            status: isReady ? 'מחובר' : (qrCodeData ? 'ממתין לסריקה' : 'מתחיל'),
            message: isReady ? 'מוכן לשליחת הודעות' : 'לא מוכן עדיין'
        }
    });
});

app.post('/api/send', async (req, res) => {
    try {
        if (!isReady || !client) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp not ready',
                hebrew: {
                    error: 'וואטסאפ לא מוכן'
                }
            });
        }

        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message required',
                hebrew: {
                    error: 'נדרש מספר טלפון והודעה'
                }
            });
        }

        // Format Israeli phone number
        let formattedNumber = phoneNumber.replace(/\D/g, '');
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '972' + formattedNumber.substring(1);
        } else if (!formattedNumber.startsWith('972')) {
            formattedNumber = '972' + formattedNumber;
        }
        formattedNumber += '@c.us';

        const result = await client.sendMessage(formattedNumber, message);

        log(`✅ Message sent to ${phoneNumber}`);

        res.json({
            success: true,
            messageId: result.id.id,
            to: formattedNumber,
            originalNumber: phoneNumber,
            message: message,
            timestamp: new Date().toISOString(),
            hebrew: {
                status: 'נשלח בהצלחה'
            }
        });

    } catch (error) {
        log('❌ Send message error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            hebrew: {
                error: 'שגיאה בשליחת הודעה'
            }
        });
    }
});

// Error handlers
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        hebrew: {
            error: 'נקודת גישה לא נמצאה'
        }
    });
});

app.use((error, req, res, next) => {
    log('❌ Server error:', error);
    res.status(500).json({
        success: false,
        error: error.message,
        hebrew: {
            error: 'שגיאת שרת'
        }
    });
});

// Start server
app.listen(port, () => {
    log(`🚀 WhatsApp API Server started on port ${port}`);
    log(`🌐 API Documentation: http://localhost:${port}/`);
    log(`💚 Health check: http://localhost:${port}/api/health`);
    log(`📱 Hebrew support: Enabled`);
    
    console.log('\n📋 Quick Start:');
    console.log('1. בדוק בריאות: GET http://localhost:' + port + '/api/health');
    console.log('2. התחבר לוואטסאפ: POST http://localhost:' + port + '/api/connect');
    console.log('3. קבל QR: GET http://localhost:' + port + '/api/qr');
    console.log('4. שלח הודעה: POST http://localhost:' + port + '/api/send');
    console.log('\n✅ השרת מוכן לשימוש!');
});
