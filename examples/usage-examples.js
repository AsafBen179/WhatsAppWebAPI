/**
 * WhatsApp API Usage Examples
 * דוגמאות שימוש ב-API של וואטסאפ
 */

const axios = require('axios');

// הגדרות
const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'your-secure-api-key-change-this-in-production'; // שנה זאת למפתח שלך

// פונקציה עזר לביצוע בקשות API
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
        console.error(`שגיאה ב-API (${method} ${endpoint}):`, error.response?.data || error.message);
        throw error;
    }
}

/**
 * דוגמה 1: התחברות בסיסית ובדיקת מצב
 */
async function example1_BasicConnection() {
    console.log('\n=== דוגמה 1: התחברות בסיסית ===');
    
    try {
        // בדיקת בריאות API
        const health = await apiRequest('GET', '/health');
        console.log('✅ API בריא:', health.status);

        // התחברות לוואטסאפ
        console.log('🔌 מתחבר לוואטסאפ...');
        await apiRequest('POST', '/connect');

        // בדיקת מצב
        const status = await apiRequest('GET', '/status');
        console.log('📱 מצב חיבור:', status.status.connectionStatus);

        // אם לא מחובר, קבל QR code
        if (!status.status.isReady) {
            const qrResponse = await apiRequest('GET', '/qr');
            if (qrResponse.qrCode) {
                console.log('📱 קוד QR זמין - סרוק עם אפליקציית וואטסאפ');
                console.log('🔗 אורך QR Code:', qrResponse.qrCode.length);
                console.log('\nהוראות:');
                qrResponse.instructions?.forEach((instruction, index) => {
                    console.log(`${index + 1}. ${instruction}`);
                });
            }
        } else {
            console.log('✅ כבר מחובר לוואטסאפ!');
        }

    } catch (error) {
        console.error('❌ דוגמת החיבור נכשלה:', error.message);
    }
}

/**
 * דוגמה 2: שליחת הודעת טקסט פשוטה
 */
async function example2_SendTextMessage() {
    console.log('\n=== דוגמה 2: שליחת הודעת טקסט ===');
    
    try {
        const phoneNumber = '0501234567'; // החלף במספר אמיתי
        const message = 'שלום! זוהי הודעת בדיקה מ-API של וואטסאפ 📱';
        
        const result = await apiRequest('POST', '/send', {
            phoneNumber,
            message,
            countryCode: '972'
        });

        if (result.success) {
            console.log('✅ הודעה נשלחה בהצלחה!');
            console.log('📝 ID הודעה:', result.messageId);
            console.log('📞 נשלח אל:', result.to);
            console.log('⏰ זמן:', new Date(result.timestamp * 1000).toLocaleString('he-IL'));
        } else {
            console.log('❌ שליחת הודעה נכשלה:', result.error);
        }

    } catch (error) {
        console.error('❌ דוגמת שליחת הודעה נכשלה:', error.message);
    }
}

/**
 * דוגמה 3: בדיקת מספרי טלפון
 */
async function example3_CheckNumbers() {
    console.log('\n=== דוגמה 3: בדיקת רישום מספרים ===');
    
    try {
        const phoneNumbers = [
            '0501234567',
            '0521234567', 
            '0531234567',
            '0541234567'
        ];
        
        console.log('בדיקת רישום מספרים בוואטסאפ:');
        
        for (const phoneNumber of phoneNumbers) {
            try {
                const result = await apiRequest('POST', '/check-number', {
                    phoneNumber,
                    countryCode: '972'
                });
                
                const status = result.isRegistered ? '✅ רשום' : '❌ לא רשום';
                console.log(`📞 ${phoneNumber}: ${status}`);
                
            } catch (error) {
                console.log(`📞 ${phoneNumber}: ❌ שגיאה בבדיקה`);
            }
            
            // השהיה קטנה בין בדיקות
            await new Promise(resolve => setTimeout(resolve, 500));
        }

    } catch (error) {
        console.error('❌ דוגמת בדיקת מספרים נכשלה:', error.message);
    }
}

/**
 * דוגמה 4: ניהול מענים אוטומטיים
 */
async function example4_AutoResponders() {
    console.log('\n=== דוגמה 4: מענים אוטומטיים ===');
    
    try {
        // הוספת מענה אוטומטי לברכות
        const responder1 = await apiRequest('POST', '/auto-responders', {
            trigger: '/^(שלום|היי|הלו)$/i',
            response: 'שלום! תודה שפניתם אלינו. איך אני יכול לעזור לכם היום? 😊',
            options: {
                id: 'greeting_hebrew',
                description: 'מענה לברכות בעברית',
                enabled: true
            }
        });
        console.log('✅ נוסף מענה אוטומטי לברכות:', responder1.responderId);

        // הוספת מענה אוטומטי לשעות פעילות
        const responder2 = await apiRequest('POST', '/auto-responders', {
            trigger: '/^(שעות|מתי פתוח|זמינות)$/i',
            response: 'שעות הפעילות שלנו:\n🕘 ראשון-חמישי: 9:00-18:00\n🕘 שישי: 9:00-13:00\n⏰ שבת: סגור\n\nנחזור אליכם בהקדם!',
            options: {
                id: 'business_hours_hebrew',
                description: 'מידע על שעות פעילות',
                enabled: true
            }
        });
        console.log('✅ נוסף מענה אוטומטי לשעות פעילות:', responder2.responderId);

        // הצגת כל המענים האוטומטיים
        const responders = await apiRequest('GET', '/auto-responders');
        console.log(`📋 סה"כ ${responders.count} מענים אוטומטיים:`);
        
        responders.autoResponders.forEach((responder, index) => {
            const status = responder.enabled ? '🟢 פעיל' : '🔴 כבוי';
            console.log(`   ${index + 1}. ${responder.id}: ${status}`);
            if (responder.description) {
                console.log(`      📝 ${responder.description}`);
            }
        });

    } catch (error) {
        console.error('❌ דוגמת מענים אוטומטיים נכשלה:', error.message);
    }
}

/**
 * דוגמה 5: שליחה קבוצתית עם השהיה
 */
async function example5_BulkMessaging() {
    console.log('\n=== דוגמה 5: שליחה קבוצתית ===');
    
    try {
        const contacts = [
            { phone: '0501234567', name: 'יוסי' },
            { phone: '0521234567', name: 'שרה' },
            { phone: '0531234567', name: 'דוד' }
        ];

        console.log(`📤 שולח הודעות ל-${contacts.length} אנשי קשר...`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const personalizedMessage = `שלום ${contact.name}! 👋\n\nזוהי הודעה אישית מה-API שלנו.\nתודה שאתם איתנו! 🙏\n\nצוות החברה`;
            
            try {
                const result = await apiRequest('POST', '/send', {
                    phoneNumber: contact.phone,
                    message: personalizedMessage,
                    countryCode: '972'
                });

                if (result.success) {
                    console.log(`✅ הודעה נשלחה ל-${contact.name} (${contact.phone})`);
                } else {
                    console.log(`❌ שליחה נכשלה ל-${contact.name}: ${result.error}`);
                }
                
            } catch (error) {
                console.log(`❌ שגיאה בשליחה ל-${contact.name}: ${error.message}`);
            }

            // השהיה בין הודעות למניעת הגבלת קצב
            if (i < contacts.length - 1) {
                console.log('⏳ ממתין 3 שניות לפני הודעה הבאה...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        console.log('🎉 שליחה קבוצתית הושלמה!');

    } catch (error) {
        console.error('❌ דוגמת שליחה קבוצתית נכשלה:', error.message);
    }
}

/**
 * דוגמה 6: סטטיסטיקות הודעות
 */
async function example6_MessageStatistics() {
    console.log('\n=== דוגמה 6: סטטיסטיקות הודעות ===');
    
    try {
        // קבלת הודעות אחרונות
        const messages = await apiRequest('GET', '/messages?limit=10');
        console.log(`📨 הודעות אחרונות (${messages.count}):`);
        
        messages.messages.slice(0, 5).forEach((msg, index) => {
            const time = new Date(msg.timestamp * 1000).toLocaleString('he-IL');
            const preview = msg.body?.substring(0, 30) + (msg.body?.length > 30 ? '...' : '');
            console.log(`   ${index + 1}. ${time}: "${preview}"`);
        });

        // חיפוש הודעות
        const searchResults = await apiRequest('GET', '/messages?search=שלום');
        console.log(`🔍 הודעות המכילות "שלום": ${searchResults.count}`);

        // סטטיסטיקות כלליות
        const stats = await apiRequest('GET', '/messages/stats');
        console.log('\n📊 סטטיסטיקות כלליות:');
        console.log(`   📈 סה"כ הודעות: ${stats.stats.totalMessages || 0}`);
        console.log(`   🤖 מענים אוטומטיים: ${stats.stats.autoRespondersCount || 0}`);
        console.log(`   📅 הודעות אחרונות (24 שעות): ${stats.stats.recentMessages24h || 0}`);
        
        if (stats.stats.messagesByType) {
            console.log('   📋 לפי סוג:');
            Object.entries(stats.stats.messagesByType).forEach(([type, count]) => {
                console.log(`      - ${type}: ${count}`);
            });
        }

    } catch (error) {
        console.error('❌ דוגמת סטטיסטיקות נכשלה:', error.message);
    }
}

/**
 * דוגמה 7: ניטור מצב החיבור
 */
async function example7_ConnectionMonitoring() {
    console.log('\n=== דוגמה 7: ניטור מצב החיבור ===');
    
    try {
        const checkInterval = 10000; // בדיקה כל 10 שניות
        let checks = 0;
        const maxChecks = 6; // הרצה למשך דקה

        console.log('🔍 מתחיל ניטור מצב החיבור...');
        
        const monitor = setInterval(async () => {
            try {
                const status = await apiRequest('GET', '/status');
                const timestamp = new Date().toLocaleTimeString('he-IL');
                
                const statusIcon = status.status.isReady ? '🟢' : '🟡';
                console.log(`[${timestamp}] ${statusIcon} מצב: ${status.status.connectionStatus} | מוכן: ${status.status.isReady ? 'כן' : 'לא'}`);
                
                if (status.status.clientInfo) {
                    console.log(`[${timestamp}] 📱 טלפון: ${status.status.clientInfo.phoneNumber}`);
                }

                checks++;
                if (checks >= maxChecks) {
                    clearInterval(monitor);
                    console.log('✅ ניטור הושלם');
                }

            } catch (error) {
                console.error('❌ בדיקת מצב נכשלה:', error.message);
            }
        }, checkInterval);

    } catch (error) {
        console.error('❌ דוגמת ניטור נכשלה:', error.message);
    }
}

/**
 * פונקציה ראשית להרצת כל הדוגמאות
 */
async function runExamples() {
    console.log('🚀 דוגמאות שימוש ב-WhatsApp API');
    console.log('=====================================');
    console.log('🌐 כתובת API:', API_BASE_URL);

    const examples = [
        { name: 'התחברות בסיסית', func: example1_BasicConnection },
        { name: 'שליחת הודעת טקסט', func: example2_SendTextMessage },
        { name: 'בדיקת מספרים', func: example3_CheckNumbers },
        { name: 'מענים אוטומטיים', func: example4_AutoResponders },
        { name: 'שליחה קבוצתית', func: example5_BulkMessaging },
        { name: 'סטטיסטיקות הודעות', func: example6_MessageStatistics },
        { name: 'ניטור חיבור', func: example7_ConnectionMonitoring }
    ];

    // הרצת דוגמאות נבחרות (בטוחות)
    const selectedExamples = [1, 3, 4, 6]; // התחברות, בדיקת מספרים, מענים אוטומטיים, סטטיסטיקות

    console.log(`\n🏃‍♂️ מריץ דוגמאות נבחרות: ${selectedExamples.join(', ')}`);

    for (const exampleIndex of selectedExamples) {
        const example = examples[exampleIndex - 1];
        if (example) {
            try {
                console.log(`\n▶️ מריץ: ${example.name}`);
                await example.func();
                await new Promise(resolve => setTimeout(resolve, 2000)); // השהיה בין דוגמאות
            } catch (error) {
                console.error(`❌ דוגמה "${example.name}" נכשלה:`, error.message);
            }
        }
    }

    console.log('\n✅ הדוגמאות הושלמו!');
    console.log('\n📋 פקודות שימושיות:');
    console.log('- pm2 status               - בדיקת מצב השירות');
    console.log('- pm2 logs whatsapp-api    - צפייה בלוגים');
    console.log('- npm test                 - הרצת בדיקות');
}

/**
 * הרצת דוגמה בודדת
 */
async function runSingleExample(exampleNumber) {
    const examples = {
        1: example1_BasicConnection,
        2: example2_SendTextMessage,
        3: example3_CheckNumbers,
        4: example4_AutoResponders,
        5: example5_BulkMessaging,
        6: example6_MessageStatistics,
        7: example7_ConnectionMonitoring
    };

    const example = examples[exampleNumber];
    if (example) {
        console.log(`🏃‍♂️ מריץ דוגמה ${exampleNumber}...`);
        await example();
    } else {
        console.error('❌ דוגמה לא נמצאה. דוגמאות זמינות: 1-7');
    }
}

// ייצוא פונקציות לשימוש בקבצים אחרים
module.exports = {
    runExamples,
    runSingleExample,
    example1_BasicConnection,
    example2_SendTextMessage,
    example3_CheckNumbers,
    example4_AutoResponders,
    example5_BulkMessaging,
    example6_MessageStatistics,
    example7_ConnectionMonitoring
};

// הרצה מהשורת פקודה
if (require.main === module) {
    const exampleNumber = process.argv[2];
    
    if (exampleNumber) {
        runSingleExample(parseInt(exampleNumber));
    } else {
        runExamples();
    }
}
