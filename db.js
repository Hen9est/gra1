// Ten plik zostawiamy pusty lub usuwamy, bo na Vercel używamy REDISA
// Ale dla spójności z server.js zrobimy tu prosty export
export default {
    getEvents: () => Promise.resolve([]),
    addEvent: () => Promise.resolve(0)
};
