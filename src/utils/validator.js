/**
 * Validation Utilities - Simplified Version
 */

function validatePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
        return false;
    }
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Israeli mobile numbers: 9-12 digits
    if (cleaned.length < 9 || cleaned.length > 12) {
        return false;
    }
    
    // Israeli mobile prefixes
    if (cleaned.startsWith('0')) {
        return cleaned.length === 10 && cleaned.startsWith('05');
    } else if (cleaned.startsWith('5')) {
        return cleaned.length === 9;
    } else if (cleaned.startsWith('972')) {
        return cleaned.length === 12;
    }
    
    return true;
}

function formatPhoneNumber(phoneNumber, countryCode = '972') {
    if (!phoneNumber) {
        throw new Error('Phone number is required');
    }
    
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (countryCode === '972') {
        // Remove leading zero
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Remove country code if present
        if (cleaned.startsWith('972')) {
            cleaned = cleaned.substring(3);
        }
        
        // Israeli mobile number should be 9 digits starting with 5
        if (cleaned.length === 9 && cleaned.startsWith('5')) {
            return `972${cleaned}@c.us`;
        }
        
        throw new Error('Invalid Israeli mobile number format');
    }
    
    // Generic formatting for other countries
    if (cleaned.startsWith(countryCode)) {
        return cleaned + '@c.us';
    }
    
    return countryCode + cleaned + '@c.us';
}

function validateMessage(message) {
    const result = {
        isValid: true,
        errors: []
    };
    
    if (!message) {
        result.isValid = false;
        result.errors.push('Message is required');
        return result;
    }
    
    if (typeof message !== 'string') {
        result.isValid = false;
        result.errors.push('Message must be a string');
        return result;
    }
    
    if (message.trim().length === 0) {
        result.isValid = false;
        result.errors.push('Message cannot be empty');
        return result;
    }
    
    if (message.length > 4096) {
        result.isValid = false;
        result.errors.push('Message exceeds maximum length of 4096 characters');
    }
    
    return result;
}

function sanitizeInput(input, options = {}) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    let sanitized = input.trim();
    
    if (options.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
}

function validateSendMessageParams(params) {
    const result = {
        isValid: true,
        errors: []
    };
    
    if (!validatePhoneNumber(params.phoneNumber)) {
        result.isValid = false;
        result.errors.push('Invalid Israeli phone number format');
    }
    
    const messageValidation = validateMessage(params.message);
    if (!messageValidation.isValid) {
        result.isValid = false;
        result.errors.push(...messageValidation.errors);
    }
    
    return result;
}

module.exports = {
    validatePhoneNumber,
    formatPhoneNumber,
    validateMessage,
    sanitizeInput,
    validateSendMessageParams
};
