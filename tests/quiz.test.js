import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuiz, checkQuiz, nextQuiz, quizScore } from '../quiz-engine.js';

test('mixed quizzes contain ten unique questions across all three formats',()=>{
  for(let seed=0;seed<50;seed++){
    const q=createQuiz(String(seed));
    assert.equal(q.deck.length,10);
    assert.equal(new Set(q.deck.map(x=>x.id)).size,10);
    assert.equal(q.deck.filter(x=>x.id.startsWith('v')).length,4);
    assert.equal(q.deck.filter(x=>x.id.startsWith('g')).length,3);
    assert.equal(q.deck.filter(x=>x.type==='order').length,3);
  }
});
test('focused practice draws the requested category',()=>{
  for(const [mode,prefix] of [['vocabulary','v'],['grammar','g']])assert(createQuiz('focus',mode).deck.every(q=>q.id.startsWith(prefix)));
});
test('quiz feedback gates progression and prevents repeat XP from duplicate checking',()=>{
  const q=createQuiz('score');assert(!nextQuiz(q));
  for(let i=0;i<10;i++){
    assert(checkQuiz(q,i<8?q.deck[i].answer:'wrong'));
    assert(!checkQuiz(q,q.deck[i].answer));
    assert.equal(q.index,i);
    assert(nextQuiz(q));
  }
  assert.equal(q.phase,'complete');assert(!checkQuiz(q,'wrong'));assert(!nextQuiz(q));
  assert.deepEqual(quizScore(q),{correct:8,total:10,xp:100});
});
test('ordinary quiz mistakes do not end the lesson early',()=>{
  const q=createQuiz('practice');for(let i=0;i<10;i++){checkQuiz(q,'wrong');nextQuiz(q);}
  assert.equal(q.phase,'complete');assert.deepEqual(quizScore(q),{correct:0,total:10,xp:20});
});
