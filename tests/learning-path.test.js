import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonCatalog,learningQuestions} from '../learning-content.js';
import {createQuiz,checkQuiz,nextQuiz,quizScore} from '../quiz-engine.js';
test('every learning-path lesson produces a valid, reproducible, completable deck',()=>{
 for(const mode of Object.keys(lessonCatalog)){
  const quiz=createQuiz('PATH',mode);assert.deepEqual(quiz,createQuiz('PATH',mode));
  assert(quiz.deck.length>=6);assert.equal(new Set(quiz.deck.map(q=>q.id)).size,quiz.deck.length);
  for(const q of quiz.deck){
   if(q.type==='choice')assert(q.options.includes(q.answer));
   if(q.type==='order')assert.deepEqual([...q.options].sort(),q.answer.split(' ').sort());
   if(q.type==='matching'){assert.equal(new Set(q.pairs.map(p=>p.es)).size,4);assert.equal(new Set(q.pairs.map(p=>p.en)).size,4);}
   checkQuiz(quiz,q.answer);nextQuiz(quiz);
  }
  assert.equal(quiz.phase,'complete');assert.equal(quizScore(quiz).correct,quiz.deck.length);
 }
});
test('learning question IDs are unique and enriched lessons contain new everyday content',()=>{
 assert.equal(new Set(learningQuestions.map(q=>q.id)).size,learningQuestions.length);
 for(const mode of ['vocabulary','grammar'])assert.equal(createQuiz('NEW',mode).deck.filter(q=>q.id.includes('extra')).length,5);
});
test('listening offers transcripts and stories retain narrative order',()=>{
 assert(createQuiz('A','listening').deck.every(q=>q.spoken&&q.lessonType==='listening'));
 assert.deepEqual(createQuiz('A','stories').deck.map(q=>q.id),createQuiz('B','stories').deck.map(q=>q.id));
});
