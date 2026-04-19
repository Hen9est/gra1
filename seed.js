const db = require('./db');

const INITIAL_DATA = {
    "04-19": [
        {y:"1902", t:"Maria i Piotr Curie wyizolowali rad. To odkrycie zmieniło naukę i medycynę na zawsze.", img:"https://upload.wikimedia.org/wikipedia/commons/7/71/Marie_Curie_c1900.jpg"},
        {y:"1862", t:"Pierwszy test pasteryzacji (Louis Pasteur). Dzięki niemu mleko i jedzenie psuje się wolniej.", img:"https://upload.wikimedia.org/wikipedia/commons/3/3c/Albert_Edelfelt_-_Louis_Pasteur_-_Google_Art_Project.jpg"},
        {y:"1841", t:"Opublikowano pierwszy nowoczesny kryminał (Edgar Allan Poe).", img:"https://upload.wikimedia.org/wikipedia/commons/7/75/Edgar_Allan_Poe_2.jpg"}
    ],
    "04-20": [
        {y:"1902", t:"Maria i Piotr Curie wyizolowali rad. To odkrycie zmieniło naukę i medycynę na zawsze.", img:"https://upload.wikimedia.org/wikipedia/commons/7/71/Marie_Curie_c1900.jpg"},
        {y:"1862", t:"Pierwszy test pasteryzacji (Louis Pasteur). Dzięki niemu mleko i jedzenie psuje się wolniej.", img:"https://upload.wikimedia.org/wikipedia/commons/3/3c/Albert_Edelfelt_-_Louis_Pasteur_-_Google_Art_Project.jpg"},
        {y:"1841", t:"Opublikowano pierwszy nowoczesny kryminał (Edgar Allan Poe).", img:"https://upload.wikimedia.org/wikipedia/commons/7/75/Edgar_Allan_Poe_2.jpg"}
    ]
    // Możesz tu dodać więcej danych lub serwer będzie je zbierał na bieżąco
};

async function seed() {
    console.log("Rozpoczynam ładowanie danych do bazy...");
    for (const date in INITIAL_DATA) {
        for (const ev of INITIAL_DATA[date]) {
            await db.addEvent(date, ev.y, ev.t, ev.img);
        }
    }
    console.log("Dane zostały załadowane pomyślnie.");
    process.exit(0);
}

seed();
