const logger = require('./utils/logger');

class MessageHandler {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
        this.autoResponders = new Map();
        this.messageLog = [];
        this.maxLogSize = 1000;
        
        this.whatsappService.addMessageHandler(this.processMessage.bind(this));
    }

    async processMessage(messageData, originalMessage) {
        try {
            this.addToMessageLog(messageData);

            if (messageData.isGroupMsg && !this.shouldProcessGroupMessages()) {
                logger.debug('Skipping group message processing');
                return;
            }

            if (this.isOwnMessage(messageData)) {
                logger.debug('Skipping own message');
                return;
            }

            await this.checkAutoResponders(messageData, originalMessage);

            if (!messageData.fromMe) {
                this.logMessageDetails(messageData);
            }

        } catch (error) {
            logger.error('Error in message processing:', error);
        }
    }

    addToMessageLog(messageData) {
        this.messageLog.push({
            ...messageData,
            processedAt: new Date().toISOString()
        });

        if (this.messageLog.length > this.maxLogSize) {
            this.messageLog = this.messageLog.slice(-this.maxLogSize);
        }
    }

    isOwnMessage(messageData) {
        return messageData.fromMe || false;
    }

    shouldProcessGroupMessages() {
        return false;
    }

    logMessageDetails(messageData) {
        const logData = {
            messageId: messageData.id,
            from: messageData.from,
            timestamp: new Date(messageData.timestamp * 1000).toISOString(),
            type: messageData.type,
            preview: messageData.body?.substring(0, 100) + (messageData.body?.length > 100 ? '...' : ''),
            isGroup: messageData.isGroupMsg,
            sender: messageData.notifyName || 'Unknown'
        };

        logger.info('📝 Message processed:', logData);
    }

    async checkAutoResponders(messageData, originalMessage) {
        try {
            if (messageData.type !== 'chat') {
                return;
            }

            const messageText = messageData.body.toLowerCase().trim();

            for (const [trigger, responder] of this.autoResponders) {
                if (responder.enabled && this.matchesTrigger(messageText, responder.trigger)) {
                    await this.executeAutoResponder(responder, messageData, originalMessage);
                    break;
                }
            }
        } catch (error) {
            logger.error('Error in auto-responder processing:', error);
        }
    }

    matchesTrigger(messageText, trigger) {
        try {
            if (typeof trigger === 'string') {
                return messageText.includes(trigger.toLowerCase());
            } else if (trigger instanceof RegExp) {
                return trigger.test(messageText);
            } else if (typeof trigger === 'function') {
                return trigger(messageText);
            }
            return false;
        } catch (error) {
            logger.error('Error matching trigger:', error);
            return false;
        }
    }

    async executeAutoResponder(responder, messageData, originalMessage) {
        try {
            let response = '';
            
            if (typeof responder.response === 'string') {
                response = responder.response;
            } else if (typeof responder.response === 'function') {
                response = await responder.response(messageData, originalMessage);
            }

            if (response) {
                const senderNumber = messageData.from.replace('@c.us', '').replace('972', '');
                
                const result = await this.whatsappService.sendMessage(senderNumber, response, '972');
                
                if (result.success) {
                    logger.info(`🤖 Auto-response sent to ${senderNumber}: "${response.substring(0, 50)}..."`, {
                        responderId: responder.id,
                        trigger: responder.trigger.toString(),
                        recipient: senderNumber
                    });
                } else {
                    logger.error(`❌ Failed to send auto-response to ${senderNumber}:`, result.error);
                }
            }
        } catch (error) {
            logger.error('Error executing auto-responder:', error);
        }
    }

    addAutoResponder(trigger, response, options = {}) {
        try {
            const responderId = options.id || `responder_${Date.now()}`;
            
            const responder = {
                id: responderId,
                trigger: trigger,
                response: response,
                enabled: options.enabled !== false,
                createdAt: new Date().toISOString(),
                description: options.description || '',
                ...options
            };

            this.autoResponders.set(responderId, responder);
            logger.info(`✅ Auto-responder added: ${responderId}`);
            
            return responderId;
        } catch (error) {
            logger.error('Error adding auto-responder:', error);
            throw error;
        }
    }

    removeAutoResponder(responderId) {
        try {
            const removed = this.autoResponders.delete(responderId);
            if (removed) {
                logger.info(`🗑️ Auto-responder removed: ${responderId}`);
            }
            return removed;
        } catch (error) {
            logger.error('Error removing auto-responder:', error);
            return false;
        }
    }

    toggleAutoResponder(responderId, enabled) {
        try {
            const responder = this.autoResponders.get(responderId);
            if (responder) {
                responder.enabled = enabled;
                logger.info(`🔄 Auto-responder ${responderId} ${enabled ? 'enabled' : 'disabled'}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Error toggling auto-responder:', error);
            return false;
        }
    }

    getAutoResponders() {
        return Array.from(this.autoResponders.values()).map(responder => ({
            ...responder,
            trigger: responder.trigger.toString()
        }));
    }

    getRecentMessages(limit = 50) {
        return this.messageLog.slice(-limit);
    }

    searchMessages(criteria = {}) {
        try {
            return this.messageLog.filter(msg => {
                if (criteria.from && !msg.from.includes(criteria.from)) return false;
                if (criteria.body && !msg.body?.toLowerCase().includes(criteria.body.toLowerCase())) return false;
                if (criteria.type && msg.type !== criteria.type) return false;
                if (criteria.isGroupMsg !== undefined && msg.isGroupMsg !== criteria.isGroupMsg) return false;
                if (criteria.after && new Date(msg.timestamp * 1000) < new Date(criteria.after)) return false;
                if (criteria.before && new Date(msg.timestamp * 1000) > new Date(criteria.before)) return false;
                
                return true;
            });
        } catch (error) {
            logger.error('Error searching messages:', error);
            return [];
        }
    }

    getMessageStats() {
        try {
            const total = this.messageLog.length;
            const byType = {};
            const byHour = new Array(24).fill(0);
            
            this.messageLog.forEach(msg => {
                byType[msg.type] = (byType[msg.type] || 0) + 1;
                
                const hour = new Date(msg.timestamp * 1000).getHours();
                byHour[hour]++;
            });

            const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
            const recentMessages = this.messageLog.filter(msg => 
                (msg.timestamp * 1000) > last24Hours
            ).length;

            return {
                totalMessages: total,
                messagesByType: byType,
                messagesByHour: byHour,
                recentMessages24h: recentMessages,
                autoRespondersCount: this.autoResponders.size,
                enabledAutoResponders: Array.from(this.autoResponders.values()).filter(r => r.enabled).length,
                lastMessageAt: total > 0 ? new Date(this.messageLog[total - 1].timestamp * 1000).toISOString() : null
            };
        } catch (error) {
            logger.error('Error getting message stats:', error);
            return {};
        }
    }
}

module.exports = MessageHandler;
