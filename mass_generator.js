const db = require('./db');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function generateDay(month, day) {
    const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    console.log(`Generowanie danych dla: ${monthDay}...`);

    const prompt = `Jesteś ekspertem edukacji i historykiem. Przygotuj 3 fascynujące wydarzenia historyczne, naukowe lub przyrodnicze dla daty: ${day} dzień miesiąca ${month}. 
    Wymagania:
    1. Odbiorca: dzieci i młodzież 9-15 lat (język ciekawy, dynamiczny).
    2. Tematyka: nauka, kosmos, wynalazki, wielkie odkrycia, przyroda, ważne bitwy (podane jako ciekawostki).
    3. Grafika: Musisz zaproponować bezpośredni URL do REALISTYCZNEGO zdjęcia z Wikimedia Commons (jpg/png). Unikaj nudnych rycin.
    4. Format wyjściowy to czysty JSON (tablica obiektów):
    [{"y": "ROK", "t": "KRÓTKI CIEKAWY OPIS (max 200 znaków)", "img": "URL_DO_REALISTYCZNEGO_ZDJECIA"}]
    Zwróć TYLKO JSON, bez żadnego dodatkowego tekstu.`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().replace(/```json|```/g, '');
        const data = JSON.parse(text);

        for (const ev of data) {
            await db.addEvent(monthDay, ev.y, ev.t, ev.img);
        }
        console.log(`  Zapisano 3 wydarzenia dla ${monthDay}.`);
    } catch (e) {
        console.error(`  Błąd dla ${monthDay}:`, e.message);
    }
}

async function run() {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    for (let i = 0; i < months.length; i++) {
        for (let d = 1; d <= daysInMonth[i]; d++) {
            await generateDay(months[i], d);
            // Mała pauza, żeby nie przekroczyć limitów darmowego API
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    console.log("GENEROWANIE ZAKOŃCZONE! Cały rok jest w Twojej bazie.");
    process.exit(0);
}

run();
