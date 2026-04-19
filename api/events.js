import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query; // Format MM-DD

  if (req.method === 'GET') {
    try {
      // 1. Próbujemy pobrać listę ID dla danego dnia
      let eventIds = await kv.get(`events:${date}`) || [];
      let events = [];
      
      // 2. Jeśli lista jest pusta, AUTOMATYCZNIE generujemy 3 fakty przez Gemini
      if (eventIds.length === 0 && date) {
        console.log(`Brak danych dla ${date}. Generuję przez Gemini...`);
        const [month, day] = date.split('-');
        
        const prompt = `Jesteś ekspertem edukacji. Przygotuj 3 fascynujące wydarzenia historyczne, naukowe lub przyrodnicze dla daty: dzień ${day}, miesiąc ${month}. 
        Wymagania: Odbiorca 9-15 lat, język ciekawy, realistyczne zdjęcia.
        Zwróć TYLKO czysty JSON (tablica obiektów):
        [{"y": "ROK", "t": "OPIS (max 200 znaków)", "img": "URL_DO_REALISTYCZNEGO_ZDJECIA_Z_WIKIMEDIA"}]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json|```/g, '');
        const generatedData = JSON.parse(text);

        for (const ev of generatedData) {
          const id = Date.now() + Math.random();
          await kv.hset(`event:${id}`, { year: ev.y, description: ev.t, image_url: ev.img || "" });
          eventIds.push(id);
        }
        // Zapisujemy listę ID na przyszłość
        await kv.set(`events:${date}`, eventIds);
      }

      // 3. Pobieramy szczegóły każdego wydarzenia
      for (const id of eventIds) {
        const event = await kv.hgetall(`event:${id}`);
        if (event) events.push({ id, ...event });
      }
      
      return res.status(200).json(events);
    } catch (err) {
      console.error("Błąd API:", err);
      return res.status(500).json({ error: "Błąd serwera lub brak połączenia z bazą KV" });
    }
  }

  if (req.method === 'POST') {
    // Logika dodawania ręcznego pozostaje bez zmian
    let { month_day, year, description, image_url } = req.body;
    const id = Date.now();
    await kv.hset(`event:${id}`, { year, description, image_url: image_url || "" });
    const eventIds = await kv.get(`events:${month_day}`) || [];
    eventIds.push(id);
    await kv.set(`events:${month_day}`, eventIds);
    return res.status(200).json({ id });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
