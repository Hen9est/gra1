import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function suggestImageUrl(year, description) {
    if (!process.env.GEMINI_API_KEY) return null;

    const prompt = `Jesteś ekspertem od edukacji dzieci (9-15 lat). Na podstawie wydarzenia: "${year}: ${description}" 
    znajdź lub opisz najbardziej REALISTYCZNĄ i ATRAKCYJNĄ wizualnie grafikę. 
    Zwróć WYŁĄCZNIE bezpośredni URL do zdjęcia z Wikimedia Commons, które wygląda jak współczesna fotografia lub wysokiej jakości realistyczna rekonstrukcja (unikaj nudnych, czarno-białych rycin). 
    Jeśli wydarzenie dotyczy nauki lub kosmosu, wybierz zdjęcia z NASA.
    FORMAT: Tylko czysty URL.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim().replace(/[<>]/g, '');
        return text.startsWith('http') ? text : null;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}
