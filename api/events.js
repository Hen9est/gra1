import Redis from 'ioredis';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Konfiguracja bezpiecznego połączenia z Redisem (wymagane przez Upstash)
const redisUrl = process.env.REDIS_URL || "";
const kv = redisUrl ? new Redis(redisUrl, {
  tls: {
    rejectUnauthorized: false
  }
}) : null;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query;
  console.log(`Log: Zapytanie o datę ${date}`);

  if (req.method !== 'GET') return res.status(405).end();

  try {
    if (!kv) throw new Error("System nie widzi REDIS_URL. Sprawdź Environment Variables.");

    // 1. Próba pobrania listy ID
    let eventIds = [];
    const rawIds = await kv.get(`events:${date}`);
    if (rawIds) {
      eventIds = JSON.parse(rawIds);
    }
    
    // 2. Jeśli lista pusta -> Generujemy przez AI
    if (eventIds.length === 0) {
      console.log("Log: Generuję nowe fakty przez Gemini...");
      const [month, day] = date.split('-');
      const prompt = `Jesteś historykiem. Podaj 3 fascynujące ciekawostki (nauka, kosmos, historia) na dzień ${day}.${month} dla dzieci 9-15 lat. 
      Zwróć TYLKO czysty JSON: [{"y":"ROK","t":"OPIS (max 200 znaków)","img":"URL_ZDJECIA_Z_WIKIMEDIA"}]`;
      
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      // Czyścimy tekst ze wszystkiego co nie jest JSONem
      text = text.substring(text.indexOf('['), text.lastIndexOf(']') + 1);
      
      const generatedData = JSON.parse(text);

      for (const ev of generatedData) {
        const id = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await kv.hset(`event:${id}`, {
          year: ev.y,
          description: ev.t,
          image_url: ev.img || ""
        });
        eventIds.push(id);
      }
      // Zapisujemy listę ID na przyszłość
      await kv.set(`events:${date}`, JSON.stringify(eventIds));
    }

    // 3. Pobieramy pełne dane o wydarzeniach
    const events = [];
    for (const id of eventIds) {
      const data = await kv.hgetall(`event:${id}`);
      if (data && data.year) {
        events.push({ id, ...data });
      }
    }

    // Jeśli wszystko zawiedzie, dajemy fakt startowy
    if (events.length === 0) {
      events.push({ year: "2026", description: "Ciekawostki są właśnie przygotowywane przez AI. Odśwież stronę za moment!", image_url: "" });
    }

    return res.status(200).json(events);

  } catch (err) {
    console.error("Błąd API:", err);
    return res.status(200).json([{
      year: "INFO", 
      description: `Błąd: ${err.message}. Upewnij się, że baza Redis i klucz Gemini są poprawnie skonfigurowane.`, 
      image_url: ""
    }]);
  }
}
