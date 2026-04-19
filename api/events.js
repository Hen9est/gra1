import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query; // Format MM-DD

  if (req.method === 'GET') {
    try {
      if (!date) return res.status(400).json({ error: "Brak daty" });

      let eventIds = await kv.get(`events:${date}`) || [];
      let events = [];
      
      if (eventIds.length === 0) {
        const [month, day] = date.split('-');
        const prompt = `Jesteś ekspertem edukacji. Przygotuj 3 fascynujące wydarzenia historyczne, naukowe lub przyrodnicze dla daty: dzień ${day}, miesiąc ${month}. 
        Wymagania: Odbiorca dzieci 9-15 lat, język dynamiczny, realistyczne zdjęcia.
        Zwróć TYLKO czysty JSON (tablica obiektów):
        [{"y": "ROK", "t": "OPIS (max 200 znaków)", "img": "URL_DO_ZDJECIA"}]`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();
        
        // Czyszczenie tekstu z markdownowych bloków
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const generatedData = JSON.parse(text);

        for (const ev of generatedData) {
          const id = Date.now() + Math.random();
          await kv.hset(`event:${id}`, { year: ev.y, description: ev.t, image_url: ev.img || "" });
          eventIds.push(id);
        }
        await kv.set(`events:${date}`, eventIds);
      }

      for (const id of eventIds) {
        const event = await kv.hgetall(`event:${id}`);
        if (event) events.push({ id, ...event });
      }
      
      return res.status(200).json(events);
    } catch (err) {
      console.error("Błąd API:", err);
      // Zwracamy puste dane zamiast błędu, by strona nie wygasła
      return res.status(200).json([{year: "AI", description: "Właśnie generuję nowe ciekawostki... Odśwież stronę za chwilę!", image_url: ""}]);
    }
  }

  if (req.method === 'POST') {
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
