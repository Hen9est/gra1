import Redis from 'ioredis';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Połączenie z Bazą (Upstash Redis)
const kv = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, {
  tls: { rejectUnauthorized: false }
}) : null;

// 2. Konfiguracja AI (Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query; // Format: MM-DD
  
  if (!date) return res.status(400).json({ error: "Brak daty" });

  try {
    if (!kv) throw new Error("Brak REDIS_URL w ustawieniach Vercel");

    // Sprawdź czy mamy już dane w bazie
    let cachedData = await kv.get(`day:${date}`);
    
    if (cachedData) {
      console.log(`Zwracam dane z bazy dla: ${date}`);
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Jeśli nie ma - poproś Gemini
    console.log(`Generuję nowe dane przez AI dla: ${date}`);
    const [m, d] = date.split('-');
    const prompt = `Jesteś historykiem. Podaj 3 fascynujące fakty na dzień ${d}.${m} dla dzieci 9-15 lat. Zwróć WYŁĄCZNIE czysty JSON (tablica): [{"y":"ROK","t":"OPIS (max 200 znaków)","img":"URL_ZDJECIA_Z_WIKIMEDIA"}]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    
    // Wyciągnij tylko tablicę JSON (naprawa błędów AI)
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    const cleanJson = text.substring(jsonStart, jsonEnd);
    
    const events = JSON.parse(cleanJson);

    // Zapisz w bazie na stałe
    await kv.set(`day:${date}`, JSON.stringify(events));

    return res.status(200).json(events);

  } catch (error) {
    console.error("Błąd API:", error);
    // Zwróć wiadomość startową jeśli wszystko inne zawiedzie
    return res.status(200).json([
      { y: "2026", t: "Właśnie przygotowujemy dla Ciebie ciekawostki historyczne. Odśwież stronę za 10 sekund!", img: "" }
    ]);
  }
}
