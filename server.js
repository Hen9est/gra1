const express = require('express');
const path = require('path');
const db = require('./db');
const gemini = require('./gemini-service');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pobierz wydarzenia dla konkretnego dnia (MM-DD)
app.get('/api/events/:date', async (req, res) => {
    try {
        const events = await db.getEvents(req.params.date);
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Dodaj nowe wydarzenie (z opcjonalnym automatycznym obrazkiem)
app.post('/api/events', async (req, res) => {
    let { month_day, year, description, image_url } = req.body;
    
    try {
        if (!image_url && description) {
            image_url = await gemini.suggestImageUrl(year, description);
        }
        const id = await db.addEvent(month_day, year, description, image_url);
        res.json({ id, image_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Aktualizuj wydarzenie
app.put('/api/events/:id', async (req, res) => {
    let { year, description, image_url } = req.body;
    try {
        if (!image_url && description) {
            image_url = await gemini.suggestImageUrl(year, description);
        }
        await db.updateEvent(req.params.id, year, description, image_url);
        res.json({ success: true, image_url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Usuń wydarzenie
app.delete('/api/events/:id', async (req, res) => {
    try {
        await db.deleteEvent(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Serwer Antygravity działa na http://localhost:${PORT}`);
});
