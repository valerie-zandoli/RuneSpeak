import { questions } from './content.js';
import { rng, shuffle } from './engine.js';
import { extraVocabulary, extraGrammar, lessonPools } from './learning-content.js';

export function createQuiz(seed, mode = 'mixed') {
  const random = rng(seed);
  let pool;
  if (lessonPools[mode]) pool = mode === 'stories' ? [...lessonPools[mode]] : shuffle(lessonPools[mode], random).slice(0,10);
  else if (mode === 'vocabulary') pool = [...shuffle(questions.filter(q => q.id.startsWith('v')), random).slice(0,5), ...shuffle(extraVocabulary,random).slice(0,5)];
  else if (mode === 'grammar') pool = [...shuffle(questions.filter(q => q.id.startsWith('g')), random).slice(0,5), ...shuffle(extraGrammar,random).slice(0,5)];
  else pool = shuffle([
    ...shuffle(questions.filter(q => q.id.startsWith('v')), random).slice(0, 4),
    ...shuffle(questions.filter(q => q.id.startsWith('g')), random).slice(0, 3),
    ...shuffle(questions.filter(q => q.type === 'order'), random).slice(0, 3),
  ], random);
  return { seed, mode, index: 0, phase: 'answer', answers: [], deck: pool.map(q => ({ ...q, options: shuffle(q.options, random) })) };
}
export function checkQuiz(quiz, value) {
  if (quiz.phase !== 'answer') return false;
  const q = quiz.deck[quiz.index];
  quiz.answers.push({ id: q.id, value, correct: value === q.answer });
  quiz.phase = 'feedback';
  return true;
}
export function nextQuiz(quiz) {
  if (quiz.phase !== 'feedback') return false;
  if (quiz.index === quiz.deck.length - 1) quiz.phase = 'complete';
  else { quiz.index++; quiz.phase = 'answer'; }
  return true;
}
export function quizScore(quiz) {
  const correct = quiz.answers.filter(a => a.correct).length;
  return { correct, total: quiz.deck.length, xp: correct * 10 + (quiz.phase === 'complete' ? 20 : 0) };
}
