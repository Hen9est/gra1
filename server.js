import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js'; // Zmienimy db.js na export default
import { suggestImageUrl } from './gemini-service.js';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Pobierz wydarzenia dla konkretnego dnia (MM-DD)
app.get('/api/events/:date', async (req, res) => {
    try {
        const events = await db.getEvents(req.params.date);
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dodaj nowe wydarzenie
app.post('/api/events', async (req, res) => {
    let { month_day, year, description, image_url } = req.body;
    try {
        if (!image_url && description) {
            image_url = await suggestImageUrl(year, description);
        }
        const id = await db.addEvent(month_day, year, description, image_url);
        res.json({ id, image_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer Antygravity działa na http://localhost:${PORT}`);
});
