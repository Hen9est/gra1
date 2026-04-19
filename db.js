const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month_day TEXT NOT NULL,
        year TEXT,
        description TEXT NOT NULL,
        image_url TEXT
    )`);
});

module.exports = {
    getEvents: (monthDay) => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM events WHERE month_day = ?", [monthDay], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    addEvent: (monthDay, year, description, imageUrl) => {
        return new Promise((resolve, reject) => {
            db.run("INSERT INTO events (month_day, year, description, image_url) VALUES (?, ?, ?, ?)", 
                [monthDay, year, description, imageUrl], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },
    updateEvent: (id, year, description, imageUrl) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE events SET year = ?, description = ?, image_url = ? WHERE id = ?", 
                [year, description, imageUrl, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    deleteEvent: (id) => {
        return new Promise((resolve, reject) => {
            db.run("DELETE FROM events WHERE id = ?", [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },
    db // Eksportujemy surowy obiekt bazy dla skryptów seedujących
};
