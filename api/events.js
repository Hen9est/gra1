import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export default async function handler(req, res) {
  const { date } = req.query;

  if (req.method === 'GET') {
    // Pobierz listę ID dla danego dnia
    const eventIds = await kv.get(`events:${date}`) || [];
    const events = [];
    
    // Pobierz szczegóły każdego wydarzenia
    for (const id of eventIds) {
      const event = await kv.hgetall(`event:${id}`);
      if (event) events.push({ id, ...event });
    }
    
    return res.status(200).json(events);
  }

  if (req.method === 'POST') {
    let { month_day, year, description, image_url } = req.body;
    
    // Automatyczne generowanie grafiki przez Gemini jeśli brak URL
    if (!image_url && description) {
      const prompt = `Jesteś ekspertem od edukacji dzieci (9-15 lat). Na podstawie wydarzenia: "${year}: ${description}" 
      znajdź najbardziej REALISTYCZNĄ i ATRAKCYJNĄ wizualnie grafikę. 
      Zwróć WYŁĄCZNIE bezpośredni URL do zdjęcia z Wikimedia Commons (jpg/png), które wygląda jak współczesna fotografia. 
      FORMAT: Tylko czysty URL.`;
      
      try {
        const result = await model.generateContent(prompt);
        image_url = result.response.text().trim().replace(/[<>]/g, '');
      } catch (e) {
        console.error("Gemini Error:", e);
      }
    }

    const id = Date.now(); // Prosty generator ID
    
    // Zapisz szczegóły wydarzenia
    await kv.hset(`event:${id}`, { year, description, image_url: image_url || "" });
    
    // Dodaj ID do listy dla danego dnia
    const eventIds = await kv.get(`events:${month_day}`) || [];
    eventIds.push(id);
    await kv.set(`events:${month_day}`, eventIds);

    return res.status(200).json({ id, image_url });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
