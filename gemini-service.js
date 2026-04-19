const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function suggestImageUrl(year, description) {
    if (!process.env.GEMINI_API_KEY) return null;

    const prompt = `Identify a relevant, high-quality public domain image from Wikipedia/Wikimedia Commons for the following historical event: "${year}: ${description}". 
    Return ONLY the direct raw image URL (ending in .jpg, .png, or .svg). If no specific image is found, suggest a general relevant Wikimedia Commons image URL. Do not include any text other than the URL.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        // Bardzo prosta walidacja czy to URL
        if (text.startsWith('http')) {
            return text;
        }
        return null;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return null;
    }
}

module.exports = { suggestImageUrl };
