import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(',').map(s => s.trim()) || 'http://localhost:5173' }));
app.use(express.json({ limit: '20kb' }));
const caps = { Easy: { suspects: 3, clues: 5, hints: 2, points: 100 }, Medium: { suspects: 4, clues: 7, hints: 3, points: 150 }, Hard: { suspects: 5, clues: 9, hints: 3, points: 200 } };
const Schema = mongoose.Schema;
const caseSchema = new Schema({
  title: String, setting: String, summary: String, story: String, difficulty: String,
  premise: String, suspects: [{ id: String, name: String, role: String, description: String }],
  clues: [{ id: String, title: String, description: String, discovered: Boolean }],
  hintTexts: [String], hintsUsed: { type: Number, default: 0 }, culpritId: String,
  explanation: String, accusedId: String, score: Number, completed: { type: Boolean, default: false },
}, { timestamps: true });
const Case = mongoose.models.Case || mongoose.model('Case', caseSchema);
const memory = new Map();
const dbReady = () => mongoose.connection.readyState === 1;
const putCase = async value => dbReady() ? Case.findByIdAndUpdate(value._id, value, { upsert: true, new: true }) : (memory.set(String(value._id), value), value);
const getCase = async id => dbReady() ? Case.findById(id).lean() : memory.get(String(id));
const generateSchema = z.object({
  title: z.string().min(3).max(90), setting: z.string().min(2).max(100), summary: z.string().min(20).max(300),
  story: z.string().min(250).max(1800), suspects: z.array(z.object({ name: z.string().min(2).max(50), role: z.string().min(2).max(70), description: z.string().min(15).max(260) })).min(3).max(5),
  clues: z.array(z.object({ title: z.string().min(2).max(70), description: z.string().min(15).max(260) })).min(5).max(9),
  culpritIndex: z.number().int().min(0).max(4), explanation: z.string().min(40).max(600), hints: z.array(z.string().min(10).max(200)).min(2).max(3),
});
const fallback = {
  title: 'The Last Light at Bellweather', setting: 'Bellweather House · North coast · 11:47 PM',
  summary: 'An antique lighthouse lens vanished during a storm. The locked gallery had three keys, and all three owners claim they never left the dining room.',
  story: 'The storm arrived just after dinner, swallowing the coastline in rain and turning Bellweather House into an island of lamplight. At 11:47, the gallery’s alarm sounded. The brass case that held the original lighthouse lens stood open. The window was latched from within, and the only door had remained in sight of the guests.\n\nMara Vale, the house archivist, says she was cataloguing letters in the library. Theo Finch, the caretaker, had gone down to check the generator. Elise Ward, a visiting restorer, insists she stayed at the piano. Each had reason to know the gallery well. Each had access to a key.\n\nThe lens is heavy, fragile, and worth a fortune to the right collector. Yet there are no footprints in the wet hall, no broken glass, and no sign that anyone carried it out. Something about the room’s silence is louder than the storm.',
  suspects: [
    { name: 'Mara Vale', role: 'House archivist', description: 'Keeps the estate records and knows which objects are insured. She says she was alone in the library.' },
    { name: 'Theo Finch', role: 'Caretaker', description: 'Has maintained Bellweather House for twelve years and holds the generator room key.' },
    { name: 'Elise Ward', role: 'Art restorer', description: 'Was hired to assess the lens before its planned exhibition. She has steady hands and an eye for replicas.' },
    { name: 'Jonah Reed', role: 'Local journalist', description: 'Was invited to write about the estate. He has been asking unusually precise questions about the lens.' },
    { name: 'Iris Bell', role: 'Family solicitor', description: 'Oversees the estate trust and knows the gallery contents were recently revalued.' },
  ],
  clues: [
    { title: 'A dry windowsill', description: 'Rain lashes the outside glass, but the sill is perfectly dry. The gallery window has not been opened tonight.' },
    { title: 'The generator log', description: 'The generator ran continuously through the storm. Theo’s handwritten log shows an inspection at 10:30, not during the alarm.' },
    { title: 'A fleck of blue wax', description: 'A small blue fleck clings to the velvet inside the empty case. The household seals its private letters with blue wax.' },
    { title: 'The dinner seating card', description: 'Mara’s place card was moved after dessert. A note on the back says “library, 11:15”—in her own hand.' },
    { title: 'A hollow chime', description: 'The gallery display pedestal rings faintly when tapped. Its carved base is deep enough to hold a small object.' },
    { title: 'The archive key', description: 'A ring of keys on the library desk has one clean gap in the dust, though Mara says she has not touched it all evening.' },
    { title: 'Fresh felt', description: 'The pedestal’s underside has a new square of dark felt. The old adhesive around it is still tacky.' },
    { title: 'A catalog correction', description: 'The lens inventory was amended this week. The handwriting matches the note on the back of Mara’s place card.' },
    { title: 'A familiar seal', description: 'The blue wax fleck bears the tiny impression of the Vale family archive seal, kept in Mara’s desk.' },
  ], culpritIndex: 0,
  explanation: 'Mara staged the theft before the alarm. The blue wax came from the archive seal she used to open the display case without leaving a forced mark. She hid the lens in the hollow pedestal, then planted a false timeline: her note placed her in the library at 11:15, before the alarm, while everyone remembered seeing her at dinner. The dry sill rules out an outside entry, and the generator log clears Theo of the midnight trip she implied.',
  hints: ['The storm may be a distraction. Check whether anyone actually needed to leave the room.', 'A clue’s material can reveal who handled it. What does the archive use to seal its records?', 'The altered inventory and the place card share a distinctive hand.'],
};
function fitDifficulty(raw, difficulty) {
  const limit = caps[difficulty];
  if (raw.suspects.length < limit.suspects || raw.clues.length < limit.clues || raw.hints.length < limit.hints || raw.culpritIndex >= limit.suspects) throw new Error('The generated case did not meet its difficulty requirements.');
  return { ...raw, suspects: raw.suspects.slice(0, limit.suspects), clues: raw.clues.slice(0, limit.clues), hints: raw.hints.slice(0, limit.hints) };
}
async function generate(premise, difficulty) {
  if (!process.env.GEMINI_API_KEY) return fitDifficulty({ ...fallback, premise }, difficulty);
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const c = caps[difficulty];
  const prompt = `Create a fair, self-contained detective mystery as JSON. Difficulty ${difficulty}: exactly ${c.suspects} distinct suspects, exactly ${c.clues} discoverable clues, exactly ${c.hints} progressively useful hints. Premise: ${premise || 'A remote old house during a storm.'}. Make all clues available from the beginning and ensure they logically support exactly one culprit. The culpritIndex is zero-based. Story 250-1500 characters. Clues reveal meaningful evidence but must not name culprit directly. Return only this JSON shape: {"title":"...","setting":"...","summary":"...","story":"...","suspects":[{"name":"...","role":"...","description":"..."}],"clues":[{"title":"...","description":"..."}],"culpritIndex":0,"explanation":"...","hints":["..."]}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash', contents: prompt, config: { responseMimeType: 'application/json', temperature: 0.85 } });
      const parsed = generateSchema.parse(JSON.parse(response.text));
      return fitDifficulty(parsed, difficulty);
    } catch (error) {
      const transient = [429, 503].includes(error.status) || ['UNAVAILABLE', 'RESOURCE_EXHAUSTED'].includes(error.statusText);
      if (!transient) throw error;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (2 ** attempt)));
        continue;
      }
      console.warn('Gemini is temporarily unavailable; using the built-in case.');
      return fitDifficulty({ ...fallback, premise }, difficulty);
    }
  }
}
function publicCase(c) {
  const value = typeof c.toObject === 'function' ? c.toObject() : c;
  return { _id: String(value._id), title: value.title, setting: value.setting, summary: value.summary, story: value.story, difficulty: value.difficulty, suspects: value.suspects, clues: value.clues, hintsUsed: value.hintsUsed, completed: value.completed };
}
const fail = (res, status, error) => res.status(status).json({ error });
app.get('/api/health', (_req, res) => res.json({ ok: true, storage: dbReady() ? 'mongodb' : 'memory' }));
app.post('/api/cases', async (req, res) => {
  const difficulty = req.body?.difficulty;
  const premise = typeof req.body?.premise === 'string' ? req.body.premise.trim().slice(0, 300) : '';
  if (!caps[difficulty]) return fail(res, 400, 'Choose Easy, Medium, or Hard difficulty.');
  try {
    const generated = await generate(premise, difficulty);
    const c = await putCase({ _id: new mongoose.Types.ObjectId(), ...generated, difficulty, premise, suspects: generated.suspects.map((s, i) => ({ ...s, id: `suspect-${i + 1}` })), clues: generated.clues.map((x, i) => ({ ...x, id: `clue-${i + 1}`, discovered: false })), hintTexts: generated.hints, hintsUsed: 0, culpritId: `suspect-${generated.culpritIndex + 1}`, explanation: generated.explanation, completed: false });
    res.status(201).json(publicCase(c));
  } catch (e) { console.error('Case generation failed:', e); fail(res, 502, 'We could not create a valid mystery. Try again, or check the Gemini API configuration.'); }
});
app.get('/api/cases/:id', async (req, res) => { try { const c = await getCase(req.params.id); return c ? res.json(publicCase(c)) : fail(res, 404, 'Case not found.'); } catch { return fail(res, 400, 'Invalid case ID.'); } });
app.post('/api/cases/:id/clues/:clueId/discover', async (req, res) => {
  try { const c = await getCase(req.params.id); if (!c) return fail(res, 404, 'Case not found.'); if (c.completed) return fail(res, 409, 'This case is already closed.'); const clue = c.clues.find(x => x.id === req.params.clueId); if (!clue) return fail(res, 404, 'Clue not found.'); clue.discovered = true; await putCase(c); return res.json(publicCase(c)); } catch { return fail(res, 400, 'Invalid case ID.'); }
});
app.post('/api/cases/:id/hints', async (req, res) => {
  try { const c = await getCase(req.params.id); if (!c) return fail(res, 404, 'Case not found.'); if (c.completed) return fail(res, 409, 'This case is already closed.'); if (c.hintsUsed >= c.hintTexts.length) return fail(res, 409, 'No hints remain.'); const hint = c.hintTexts[c.hintsUsed++]; await putCase(c); return res.json({ case: publicCase(c), hint }); } catch { return fail(res, 400, 'Invalid case ID.'); }
});
app.post('/api/cases/:id/accuse', async (req, res) => {
  try { const c = await getCase(req.params.id); if (!c) return fail(res, 404, 'Case not found.'); if (c.completed) return fail(res, 409, 'This case is already closed.'); const accused = c.suspects.find(s => s.id === req.body?.suspectId); if (!accused) return fail(res, 400, 'Choose a valid suspect before accusing.'); const correct = accused.id === c.culpritId; const cluesFound = c.clues.filter(x => x.discovered).length; const score = Math.max(0, (correct ? caps[c.difficulty].points : 0) + cluesFound * 5 - c.hintsUsed * 10); c.completed = true; c.accusedId = accused.id; c.score = score; await putCase(c); const culprit = c.suspects.find(s => s.id === c.culpritId); return res.json({ correct, accusedName: accused.name, culprit, explanation: c.explanation, score, cluesFound, hintsUsed: c.hintsUsed, difficulty: c.difficulty }); } catch { return fail(res, 400, 'Invalid case ID.'); }
});
app.get('/api/cases/:id/result', async (req, res) => { try { const c = await getCase(req.params.id); if (!c) return fail(res, 404, 'Case not found.'); if (!c.completed) return fail(res, 409, 'Make an accusation before viewing the result.'); const accused = c.suspects.find(s => s.id === c.accusedId); return res.json({ correct: c.accusedId === c.culpritId, accusedName: accused?.name, culprit: c.suspects.find(s => s.id === c.culpritId), explanation: c.explanation, score: c.score, cluesFound: c.clues.filter(x => x.discovered).length, hintsUsed: c.hintsUsed, difficulty: c.difficulty }); } catch { return fail(res, 400, 'Invalid case ID.'); } });
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });
const port = Number(process.env.PORT) || 4000;
if (process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(() => console.log('MongoDB connected')).catch(error => console.error('MongoDB connection failed; using in-memory storage:', error.message));
app.listen(port, () => console.log(`Mystery Room API listening on ${port}`));
