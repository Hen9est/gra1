import Redis from 'ioredis';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Łączymy się z bazą używając Twojej zmiennej REDIS_URL
const kv = new Redis(process.env.REDIS_URL || "");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query; // MM-DD

  if (req.method === 'GET') {
    try {
      if (!date) return res.status(400).json({ error: "Brak daty" });

      // Sprawdź czy mamy ID dla tego dnia
      let eventIdsRaw = await kv.get(`events:${date}`);
      let eventIds = eventIdsRaw ? JSON.parse(eventIdsRaw) : [];
      let events = [];
      
      if (eventIds.length === 0) {
        const [month, day] = date.split('-');
        const prompt = `Jesteś historykiem dla dzieci 9-15 lat. Podaj 3 fascynujące fakty na dzień ${day}.${month}. Zwróć TYLKO czysty JSON (tablica obiektów): [{"y":"ROK","t":"OPIS (max 200 znaków)","img":"URL_ZDJECIA"}]`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const generatedData = JSON.parse(text);

        for (const ev of generatedData) {
          const id = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          await kv.hset(`event:${id}`, 'year', ev.y, 'description', ev.t, 'image_url', ev.img || "");
          eventIds.push(id);
        }
        await kv.set(`events:${date}`, JSON.stringify(eventIds));
      }

      for (const id of eventIds) {
        const event = await kv.hgetall(`event:${id}`);
        if (event && event.description) events.push({ id, ...event });
      }
      
      return res.status(200).json(events);
    } catch (err) {
      console.error("Błąd API:", err);
      return res.status(200).json([{year: "AI", description: "Generuję ciekawostki... Odśwież za moment!", image_url: ""}]);
    }
  }

  if (req.method === 'POST') {
    let { month_day, year, description, image_url } = req.body;
    const id = `ev_${Date.now()}`;
    await kv.hset(`event:${id}`, 'year', year, 'description', description, 'image_url', image_url || "");
    let eventIdsRaw = await kv.get(`events:${month_day}`);
    let eventIds = eventIdsRaw ? JSON.parse(eventIdsRaw) : [];
    eventIds.push(id);
    await kv.set(`events:${month_day}`, JSON.stringify(eventIds));
    return res.status(200).json({ id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
