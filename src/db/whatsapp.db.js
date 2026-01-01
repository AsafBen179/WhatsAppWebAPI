const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

const db = new Database(path.join(dbDir, 'whatsapp.db'));

// טבלת הודעות
db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    fromNumber TEXT NOT NULL,
    toNumber TEXT,
    body TEXT,
    timestamp INTEGER,
    type TEXT,
    isGroupMsg INTEGER,
    processed INTEGER DEFAULT 0
)
`).run();

module.exports = db;
