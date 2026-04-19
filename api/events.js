import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query;
  console.log(`Zapytanie o datę: ${date}`);

  if (req.method === 'GET') {
    try {
      if (!date) return res.status(400).json({ error: "Brak daty w zapytaniu" });

      // Sprawdź połączenie z bazą
      let eventIds;
      try {
        eventIds = await kv.get(`events:${date}`) || [];
      } catch (kvError) {
        console.error("Błąd połączenia z Vercel KV:", kvError);
        return res.status(500).json({ error: "Baza KV nie jest podłączona lub skonfigurowana" });
      }

      if (eventIds.length === 0) {
        console.log(`Baza pusta dla ${date}. Proszę Gemini o pomoc...`);
        
        if (!process.env.GEMINI_API_KEY) {
          console.error("BRAK KLUCZA GEMINI_API_KEY W SETTINGS!");
          return res.status(200).json([{year: "BŁĄD", description: "Brak klucza API Gemini w ustawieniach Vercel!", image_url: ""}]);
        }

        const [month, day] = date.split('-');
        const prompt = `Jesteś historykiem dla dzieci 9-15 lat. Podaj 3 fakty na dzień ${day}.${month}. Zwróć TYLKO JSON: [{"y":"ROK","t":"OPIS","img":"URL"}]`;

        const result = await model.generateContent(prompt);
        let text = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '').trim();
        
        console.log("Gemini zwrócił tekst:", text);
        const generatedData = JSON.parse(text);

        for (const ev of generatedData) {
          const id = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await kv.hset(`event:${id}`, { year: ev.y, description: ev.t, image_url: ev.img || "" });
          eventIds.push(id);
        }
        await kv.set(`events:${date}`, eventIds);
        console.log(`Sukces! Zapisano ${eventIds.length} nowych faktów.`);
      }

      const events = [];
      for (const id of eventIds) {
        const event = await kv.hgetall(`event:${id}`);
        if (event) events.push({ id, ...event });
      }
      
      return res.status(200).json(events);
    } catch (err) {
      console.error("KRYTYCZNY BŁĄD API:", err);
      return res.status(200).json([{year: "INFO", description: `Błąd: ${err.message}. Sprawdź logi Vercel.`, image_url: ""}]);
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
