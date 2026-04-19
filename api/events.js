import Redis from 'ioredis';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ulepszone połączenie z Redisem
const redisUrl = process.env.REDIS_URL || "";
const kv = redisUrl ? new Redis(redisUrl) : null;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query;
  console.log(`Przetwarzanie daty: ${date}`);

  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (!kv) throw new Error("Brak REDIS_URL w środowisku Vercel");

    // 1. Pobierz listę ID
    let eventIdsRaw = await kv.get(`events:${date}`);
    let eventIds = eventIdsRaw ? JSON.parse(eventIdsRaw) : [];
    
    // 2. Jeśli pusto, generuj przez AI
    if (eventIds.length === 0) {
      console.log("Generowanie faktów przez Gemini...");
      const [month, day] = date.split('-');
      const prompt = `Podaj 3 ciekawostki historyczne/naukowe na ${day}.${month} dla dzieci 9-15 lat. Zwróć TYLKO JSON: [{"y":"ROK","t":"OPIS","img":"DIRECT_URL_JPG"}]`;
      
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedData = JSON.parse(text);

      for (const ev of generatedData) {
        const id = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await kv.hset(`event:${id}`, 'year', ev.y, 'description', ev.t, 'image_url', ev.img || "");
        eventIds.push(id);
      }
      await kv.set(`events:${date}`, JSON.stringify(eventIds));
    }

    // 3. Pobierz szczegóły
    const events = [];
    for (const id of eventIds) {
      const event = await kv.hgetall(`event:${id}`);
      if (event && event.year) events.push({ id, ...event });
    }

    return res.status(200).json(events.length ? events : [{year: "2026", description: "Ciekawostki są w drodze! Odśwież stronę.", image_url: ""}]);

  } catch (err) {
    console.error("Błąd API:", err);
    return res.status(200).json([{
      year: "INFO", 
      description: `Wystąpił problem: ${err.message}. Sprawdź czy REDIS_URL i GEMINI_API_KEY są poprawne w Vercel.`, 
      image_url: ""
    }]);
  }
}
