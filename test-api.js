/**
 * Test API Script
 * Simple test to verify the WhatsApp API is working
 */

const axios = require('axios').default;

const API_BASE_URL = 'http://localhost:3000';
const API_KEY = 'your-secure-api-key-change-this-in-production'; // Change this to your actual API key

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ API Error (${method} ${endpoint}):`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck() {
    console.log('\n🏥 Testing Health Check...');
    try {
        const health = await apiRequest('GET', '/api/health');
        console.log('✅ Health check passed');
        console.log(`   Status: ${health.status}`);
        console.log(`   Environment: ${health.environment}`);
        console.log(`   PM2: ${health.pm2?.managed ? 'Managed' : 'Not managed'}`);
        console.log(`   WhatsApp Ready: ${health.whatsapp?.isReady ? 'Yes' : 'No'}`);
        return true;
    } catch (error) {
        console.log('❌ Health check failed');
        return false;
    }
}

/**
 * Test 2: API Documentation
 */
async function testDocumentation() {
    console.log('\n📖 Testing API Documentation...');
    try {
        const docs = await apiRequest('GET', '/');
        console.log('✅ Documentation accessible');
        console.log(`   API Name: ${docs.name}`);
        console.log(`   Version: ${docs.version}`);
        console.log(`   Environment: ${docs.environment}`);
        return true;
    } catch (error) {
        console.log('❌ Documentation test failed');
        return false;
    }
}

/**
 * Test 3: WhatsApp Status
 */
async function testWhatsAppStatus() {
    console.log('\n📱 Testing WhatsApp Status...');
    try {
        const status = await apiRequest('GET', '/api/status');
        console.log('✅ Status check passed');
        console.log(`   Connection Status: ${status.status?.connectionStatus}`);
        console.log(`   Ready: ${status.status?.isReady ? 'Yes' : 'No'}`);
        console.log(`   Has QR Code: ${status.status?.hasQrCode ? 'Yes' : 'No'}`);
        
        if (status.status?.clientInfo) {
            console.log(`   Phone: ${status.status.clientInfo.phoneNumber}`);
        }
        
        return status.status?.isReady;
    } catch (error) {
        console.log('❌ Status check failed');
        return false;
    }
}

/**
 * Test 4: WhatsApp Connection
 */
async function testWhatsAppConnection() {
    console.log('\n🔌 Testing WhatsApp Connection...');
    try {
        const result = await apiRequest('POST', '/api/connect');
        console.log('✅ Connection initiated');
        console.log(`   Message: ${result.message}`);
        
        // Wait a moment and check QR code
        setTimeout(async () => {
            try {
                const qr = await apiRequest('GET', '/api/qr');
                if (qr.qrCode) {
                    console.log('📱 QR Code available - scan with WhatsApp app');
                    console.log('   QR Code length:', qr.qrCode.length);
                } else {
                    console.log('ℹ️  No QR code needed (already authenticated)');
                }
            } catch (error) {
                console.log('⚠️  Could not get QR code');
            }
        }, 2000);
        
        return true;
    } catch (error) {
        console.log('❌ Connection test failed');
        return false;
    }
}

/**
 * Test 5: Phone Number Validation
 */
async function testPhoneValidation() {
    console.log('\n📞 Testing Phone Number Validation...');
    try {
        const testNumbers = [
            { number: '0501234567', expected: true, description: 'Valid Israeli mobile' },
            { number: '501234567', expected: true, description: 'Valid Israeli mobile (no leading 0)' },
            { number: '9721234567', expected: false, description: 'Invalid Israeli number' },
            { number: '123456', expected: false, description: 'Too short' }
        ];

        for (const test of testNumbers) {
            try {
                const result = await apiRequest('POST', '/api/check-number', {
                    phoneNumber: test.number,
                    countryCode: '972'
                });
                console.log(`   ${test.number} (${test.description}): Valid format ✅`);
            } catch (error) {
                if (error.response?.status === 400) {
                    console.log(`   ${test.number} (${test.description}): Invalid format ❌`);
                } else {
                    console.log(`   ${test.number}: API error`);
                }
            }
        }
        
        return true;
    } catch (error) {
        console.log('❌ Phone validation test failed');
        return false;
    }
}

/**
 * Test 6: Auto-Responders
 */
async function testAutoResponders() {
    console.log('\n🤖 Testing Auto-Responders...');
    try {
        // Get current auto-responders
        const responders = await apiRequest('GET', '/api/auto-responders');
        console.log(`✅ Found ${responders.count} auto-responders`);
        
        responders.autoResponders.forEach(responder => {
            console.log(`   - ${responder.id}: ${responder.enabled ? 'Enabled' : 'Disabled'}`);
        });
        
        // Test adding a new responder
        const newResponder = await apiRequest('POST', '/api/auto-responders', {
            trigger: 'test',
            response: 'This is a test auto-response',
            options: {
                id: 'test_responder',
                description: 'Test responder for API validation'
            }
        });
        
        console.log(`✅ Added test responder: ${newResponder.responderId}`);
        
        // Remove the test responder
        await apiRequest('DELETE', `/api/auto-responders/${newResponder.responderId}`);
        console.log('✅ Removed test responder');
        
        return true;
    } catch (error) {
        console.log('❌ Auto-responders test failed');
        return false;
    }
}

/**
 * Test 7: Message Statistics
 */
async function testMessageStats() {
    console.log('\n📊 Testing Message Statistics...');
    try {
        const stats = await apiRequest('GET', '/api/messages/stats');
        console.log('✅ Statistics retrieved');
        console.log(`   Total Messages: ${stats.stats?.totalMessages || 0}`);
        console.log(`   Auto-Responders: ${stats.stats?.autoRespondersCount || 0}`);
        console.log(`   Recent (24h): ${stats.stats?.recentMessages24h || 0}`);
        
        return true;
    } catch (error) {
        console.log('❌ Message statistics test failed');
        return false;
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('🧪 WhatsApp API Test Suite');
    console.log('===========================');
    console.log(`🌐 Testing API at: ${API_BASE_URL}`);
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0
    };

    const tests = [
        { name: 'Health Check', func: testHealthCheck },
        { name: 'Documentation', func: testDocumentation },
        { name: 'WhatsApp Status', func: testWhatsAppStatus },
        { name: 'WhatsApp Connection', func: testWhatsAppConnection },
        { name: 'Phone Validation', func: testPhoneValidation },
        { name: 'Auto-Responders', func: testAutoResponders },
        { name: 'Message Statistics', func: testMessageStats }
    ];

    for (const test of tests) {
        results.total++;
        try {
            const success = await test.func();
            if (success) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            results.failed++;
            console.log(`❌ Test "${test.name}" threw an error:`, error.message);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log('\n📋 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total:  ${results.total}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    if (results.failed === 0) {
        console.log('\n🎉 All tests passed! API is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }

    console.log('\n🔗 Useful URLs:');
    console.log(`   API Docs: ${API_BASE_URL}/`);
    console.log(`   Health:   ${API_BASE_URL}/api/health`);
    console.log(`   Status:   ${API_BASE_URL}/api/status`);
    console.log(`   QR Code:  ${API_BASE_URL}/api/qr`);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testHealthCheck,
    testWhatsAppStatus,
    testWhatsAppConnection
};
