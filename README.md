# WhatsApp API Server 📱

## תיאור כללי
שרת API מלא לאוטומציה של וואטסאפ עם תמיכה בעברית וביצועים גבוהים. הפרויקט כולל דוקומנטציה מלאה של Swagger וממשק משתמש אינטראקטיבי.

## ✨ תכונות עיקריות

### 🚀 ניהול הודעות
- שליחת הודעות טקסט ומדיה
- בדיקת זמינות מספרי טלפון
- מעקב אחר הודעות שנשלחו
- סטטיסטיקות מפורטות

### 🤖 מענים אוטומטיים
- יצירת מענים חכמים
- תמיכה בביטויים רגולריים
- הפעלה/כיבוי דינמי
- ניהול מרובה מענים

### 🔒 אבטחה מתקדמת
- אימות API Key
- הגנת CORS
- מיגון אבטחה עם Helmet
- לוגים מפורטים

### 📊 ניטור וביצועים
- בדיקות בריאות מפורטות
- תמיכה ב-PM2
- ניהול זיכרון יעיל
- מעקב אחר זמן פעילות

## 📚 דוקומנטציה אינטראקטיבית

הפרויקט כולל דוקומנטציה מלאה של Swagger עם ממשק משתמש אינטראקטיבי:

### 🌐 קישורים לדוקומנטציה:
- **Swagger UI עיקרי**: `http://localhost:3000/api/docs`
- **Swagger UI משני**: `http://localhost:3000/docs`
- **Swagger JSON**: `http://localhost:3000/api/swagger.json`

### 📋 מה כלול בדוקומנטציה:
- ✅ כל נקודות הגישה (Endpoints)
- ✅ דוגמאות בקשות ותגובות
- ✅ סכמות נתונים מפורטות
- ✅ תמיכה בעברית ואנגלית
- ✅ אימות API Key מובנה
- ✅ קטגוריות מאורגנות:
  - **Health**: בדיקות בריאות השרת
  - **Connection**: ניהול חיבור וואטסאפ
  - **Messages**: שליחה וניהול הודעות
  - **Auto-Responders**: מענים אוטומטיים
  - **Utilities**: כלים נוספים

## 🚀 התקנה מהירה

### דרישות מקדימות
- Node.js 16+ 
- Windows (לתמיכה ב-PM2 Windows Service)

### התקנה
```bash
# שכפול הפרויקט
git clone [repository-url]
cd WhatsAppAPI

# התקנת תלויות (כולל Swagger)
npm install

# העתקת קובץ הגדרות
copy .env.example .env
```

### הגדרת משתני סביבה (.env)
```env
# הגדרות בסיסיות
PORT=3000
NODE_ENV=development

# אבטחה - חובה לעדכן בפרודקשן!
API_KEY=your-secure-api-key-change-this-in-production

# הגדרות CORS (אופציונלי)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# הגדרות Webhook (אופציונלי)
WEBHOOK_TOKEN=your-webhook-secret-token
```

### הרצה מקומית
```bash
# הרצה רגילה
npm start

# הרצה עם פיתוח (nodemon)
npm run dev

# הרצה עם PM2
npm run pm2:start
```

## 📖 שימוש מהיר

### 1. התחברות לדוקומנטציה
פתח דפדפן וגש ל: `http://localhost:3000/api/docs`

### 2. הגדרת API Key
בממשק Swagger:
1. לחץ על כפתור "Authorize" 🔓
2. הכנס את ה-API Key שלך
3. לחץ "Authorize"

### 3. בדיקת חיבור
```bash
curl -X GET "http://localhost:3000/api/health" \
  -H "x-api-key: your-api-key"
```

### 4. חיבור לוואטסאפ
```bash
# התחלת חיבור
curl -X POST "http://localhost:3000/api/connect" \
  -H "x-api-key: your-api-key"

# קבלת QR קוד
curl -X GET "http://localhost:3000/api/qr" \
  -H "x-api-key: your-api-key"
```

### 5. שליחת הודעה ראשונה
```bash
curl -X POST "http://localhost:3000/api/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "phoneNumber": "0501234567",
    "message": "שלום! זוהי הודעת בדיקה מה-API"
  }'
```

## 🎯 דוגמאות שימוש בממשק Swagger

### 🔍 חקירת ה-API
1. **התחלה**: גש ל-`/api/docs`
2. **בחירת קטגוריה**: לחץ על אחת מהקטגוריות
3. **בדיקת Endpoint**: לחץ "Try it out"
4. **מילוי פרמטרים**: הכנס נתונים לדוגמה
5. **הרצה**: לחץ "Execute"
6. **צפייה בתוצאות**: קבל תגובה מלאה

### 📱 דוגמה: שליחת הודעה
1. פתח קטגוריה "Messages"
2. מצא POST `/api/send`
3. לחץ "Try it out"
4. מלא:
   ```json
   {
     "phoneNumber": "0501234567",
     "message": "שלום מSwagger!"
   }
   ```
5. לחץ "Execute"

### 🤖 דוגמה: הוספת מענה אוטומטי
1. פתח קטגוריה "Auto-Responders"
2. מצא POST `/api/auto-responders`
3. מלא:
   ```json
   {
     "trigger": "שלום",
     "response": "שלום! איך אני יכול לעזור?",
     "options": {
       "id": "greeting_hebrew",
       "description": "מענה בעברית לברכה"
     }
   }
   ```

## 🛠️ ניהול עם PM2

### פקודות PM2 בסיסיות
```bash
# התחלה
npm run pm2:start

# עצירה
npm run pm2:stop

# הפעלה מחדש
npm run pm2:restart

# צפייה בסטטוס
npm run pm2:status

# צפייה בלוגים
npm run pm2:logs

# מחיקת אפליקציה
npm run pm2:delete
```

### התקנה כשירות Windows
```bash
# התקנת שירות Windows
npm run pm2:service-install

# הפעלת השירות
npm run pm2:service-start

# עצירת השירות
npm run pm2:service-stop
```

## 📊 ניטור ולוגים

### לוגים מפורטים
- **מיקום**: `./logs/`
- **רמות**: ERROR, WARN, INFO, DEBUG
- **פורמט**: JSON מובנה
- **סיבוב**: יומי אוטומטי

### בדיקות בריאות
```bash
# בדיקה מלאה
GET /api/health

# סטטיסטיקות הודעות
GET /api/messages/stats

# מידע לקוח
GET /api/client-info
```

## 🔧 הגדרות מתקדמות

### אבטחה מתקדמת
```env
# מפתח API חזק
API_KEY=your-super-strong-api-key-here

# הגבלת מקורות
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# טוקן Webhook
WEBHOOK_TOKEN=webhook-secret-token-here
```

### אופטימיזציה
```env
# גודל בקשה מקסימלי
REQUEST_SIZE_LIMIT=10mb

# זמן תפוגה לבקשות
REQUEST_TIMEOUT=30000

# רמת לוגים
LOG_LEVEL=info
```

## 🐛 פתרון בעיות נפוצות

### שגיאת "swagger-jsdoc not found"
```bash
npm install swagger-jsdoc swagger-ui-express
```

### שגיאת חיבור לוואטסאפ
1. בדוק שהשרת רץ: `GET /api/health`
2. נקה sessions: מחק תיקיית `./sessions`
3. קבל QR חדש: `GET /api/qr`

### שגיאת API Key
1. בדוק קובץ `.env`
2. ודא שהכותרת `x-api-key` נשלחת
3. בSwagger: לחץ "Authorize" והכנס המפתח

### בעיות ביצועים
1. בדוק זיכרון: `GET /api/health`
2. הפעל מחדש: `npm run pm2:restart`
3. נקה לוגים ישנים

## 📈 שדרוגים עתידיים

### תכונות מתוכננות
- [ ] תמיכה בקבוצות וואטסאפ
- [ ] שליחת הודעות מתוזמנות
- [ ] אנליטיקה מתקדמת
- [ ] Integration עם CRM
- [ ] Webhook מתקדם יותר

### שיפורי Swagger
- [ ] דוגמאות אינטראקטיביות נוספות
- [ ] תמיכה בשפות נוספות
- [ ] ייצוא לקובצי Postman
- [ ] בדיקות אוטומטיות

## 🤝 תמיכה וקהילה

### קבלת עזרה
- **Issues**: צור issue ב-GitHub
- **דוקומנטציה**: `/api/docs`
- **לוגים**: `./logs/error.log`

### השתתפות בפיתוח
1. Fork הפרויקט
2. צור branch לתכונה שלך
3. Commit השינויים
4. צור Pull Request

## 📄 רישיון
MIT License - ראה קובץ LICENSE למידע מלא.

---

**🎉 ברוכים הבאים לעולם האוטומציה של וואטסאפ!**

להתחלה מהירה, גש ל-`http://localhost:3000/api/docs` ותתחיל לחקור את כל האפשרויות הזמינות.
