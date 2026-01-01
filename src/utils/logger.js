const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let logMessage = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(meta).length > 0) {
                logMessage += `\n  ${JSON.stringify(meta, null, 2)}`;
            }
            return logMessage;
        })
    ),
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log')
        })
    ]
});

// Add helper methods
logger.addRequestId = (req, res, next) => {
    req.requestId = Math.random().toString(36).substr(2, 9);
    if (next) next();
};

logger.httpLogger = (req, res, next) => {
    const start = Date.now();
    
    logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection?.remoteAddress
    });
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        
        logger.log(logLevel, 'HTTP Response', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });
    
    next();
};

logger.apiError = (error, req = null) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        ...(req && {
            method: req.method,
            url: req.url,
            body: req.body
        })
    };
    
    logger.error('API Error', errorInfo);
};

module.exports = logger;
