import { lessonCatalog, learningQuestions } from './learning-content.js';
import { createQuiz, checkQuiz, nextQuiz, quizScore } from './quiz-engine.js';
import { questions } from './content.js';
import { wizardArt, adventureHeroes, treasureArt } from './ui-art.js';

const $ = id => document.getElementById(id);
const esc = x => String(x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths = {
  home: '<path d="M4 11 12 4l8 7v10h-6v-7h-4v7H4z"/>',
  sword: '<path d="m5 19 14-14h-5L5 14m5 0 4 4m-8-8 8 8M3 21l3-3"/>',
  book: '<path d="M12 6c-3-2-7-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-6-1-9 1Zm0 0v15"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  flame: '<path d="M13 2c1 7-7 7-5 12 2-1 3-3 3-5 6 5 8 8 5 12-10 5-16-8-3-19Z"/>',
  bolt: '<path d="m14 2-10 12h7l-1 8L21 9h-8z"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0Zm5 11v6m-4 1h8M7 5H3v3c0 3 2 4 5 4m9-7h4v3c0 3-2 4-5 4"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sound: '<path d="M4 9h4l5-5v16l-5-5H4zm13-2c3 3 3 7 0 10m3-13c5 5 5 11 0 16"/>',
};
function icon(name, cls = '') { return `<svg class="p-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.star}</svg>`; }
function sprite(n, cls='') { return `<span class="sprite ${cls}" style="background-position:-${n%12*32}px -${Math.floor(n/12)*32}px" aria-hidden="true"></span>`; }
const today = () => { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
let profile = { xp: 0, lessons: 0, streak: 0, lastDay: '', words: {}, daily: {date: today(), lessons:0, correct:0, xp:0} };
try { const saved=JSON.parse(localStorage.getItem('runespeak-learning'));if(saved && Number.isFinite(saved.xp)&&Number.isFinite(saved.lessons)&&Number.isFinite(saved.streak)&&saved.words&&saved.daily)profile=saved; } catch {}
function refreshDay() { if(profile.daily.date!==today())profile.daily={date:today(),lessons:0,correct:0,xp:0}; }
function saveProfile() { try{localStorage.setItem('runespeak-learning',JSON.stringify(profile));}catch{} }
profile.completed ||= {};
let quiz=null, choice=null, tokens=[], awarded=false, review=false;
let lessonReturn='home', matchLeft=null, matched=[], matchErrors=0, transcript=false;
const pathScreen=document.createElement('section');pathScreen.id='learning-path-screen';pathScreen.hidden=true;document.body.append(pathScreen);
const allLearningQuestions=[...questions,...learningQuestions];

function go(view, updateHistory=true) {
  if('speechSynthesis' in window)speechSynthesis.cancel();
  if(updateHistory && ['home','path'].includes(view)) history.pushState(null,'',view==='path'?'#learning-path':'#home');
  pathScreen.hidden=view!=='path';
  document.body.dataset.view=view;
  document.dispatchEvent(new CustomEvent('runespeak:view',{detail:view}));
  $('home-screen').hidden=view!=='home'; $('quiz-screen').hidden=view!=='quiz';
  document.querySelector('.game-shell').hidden=view!=='dungeon';
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  window.scrollTo(0,0);
  if(view==='home')renderHome();
  if(view==='path')renderLearningPath();
  if(view==='dungeon')document.dispatchEvent(new CustomEvent('runespeak:enter'));
}
function openDungeon() { go('dungeon'); }
function startQuiz(mode='mixed') { lessonReturn=document.body.dataset.view==='path'?'path':'home';matched=[];matchErrors=0;matchLeft=null;transcript=false;quiz=createQuiz(`${Date.now()}-${Math.random()}`,mode);choice=null;tokens=[];awarded=false;review=false;go('quiz');renderQuiz(); }
const lessons = lessonCatalog;
function lessonPreview(mode) {
  const lesson=lessons[mode];
  openModal(`<div class="lesson-preview"><div class="preview-symbol ${mode}">${icon(lesson.symbol)}</div><div class="modal-kicker">${profile.completed[mode]?'KEEP YOUR SKILLS SHARP':'A LITTLE PRACTICE GOES A LONG WAY'}</div><h2>${lesson.title}</h2><p>${lesson.description}</p><div class="lesson-tip"><b>${esc(lesson.example)}</b><p>${esc(lesson.tip)}</p></div><div class="lesson-facts"><span>◷ About 3 minutes</span><span>${icon('bolt')} Up to ${['matching','stories'].includes(mode)?80:120} XP</span></div><small>${lesson.detail} · No lives lost</small><button class="p-button" id="start-lesson">START LESSON</button></div>`);
  $('start-lesson').onclick=()=>startQuiz(mode);
}
function practiceHub() {
  openModal(`<div class="modal-kicker">PRACTICE YOUR WAY</div><h2>What shall we work on?</h2><p>Pick a skill. A few minutes is all it takes.</p><div class="practice-choices">${Object.entries(lessons).filter(([mode])=>['vocabulary','grammar','mixed'].includes(mode)).map(([mode,l])=>`<button data-practice="${mode}"><span class="practice-icon ${mode}">${icon(l.symbol)}</span><span><strong>${l.title}</strong><small>${l.detail}</small></span><b aria-hidden="true">›</b></button>`).join('')}</div>`);
  document.querySelectorAll('[data-practice]').forEach(b=>b.onclick=()=>lessonPreview(b.dataset.practice));
}
function quest(label, count, target, symbol) { return `<div class="quest-row"><span class="quest-symbol">${icon(symbol)}</span><div><strong>${label}</strong><div class="quest-meter"><span style="width:${Math.min(100,count/target*100)}%"></span><small>${Math.min(count,target)} / ${target}</small></div></div></div>`; }
function renderHome() {
  refreshDay();
  let run;try{run=JSON.parse(localStorage.getItem('runespeak-v2'));}catch{}
  const continuing=run&&['challenge','feedback','doors'].includes(run.phase);
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const prior=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  const streak=[today(),prior].includes(profile.lastDay)?profile.streak:0;
  $('home-screen').innerHTML=`<aside class="learn-sidebar"><a href="#" class="wordmark" aria-label="RuneSpeak home"><svg class="brand-rune" viewBox="0 0 24 32" aria-hidden="true"><path d="M4 29V3l15 10-15 7m8-4 9 13" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>unespeak</span></a><nav aria-label="Learning navigation"><button class="nav-item active" id="nav-learn" aria-label="Learn" aria-current="page">${icon('home')}<span>HOME</span></button><button class="nav-item" id="nav-path">${icon('book')}<span>LEARNING PATH</span></button><button class="nav-item" data-dungeon aria-label="Adventure">${icon('sword')}<span>ADVENTURE</span><span class="new-tag">NEW</span></button><button class="nav-item" id="nav-practice" aria-label="Practice">${icon('book')}<span>PRACTICE</span></button><button class="nav-item" id="nav-words" aria-label="Your words">${icon('star')}<span>YOUR WORDS</span></button></nav><div class="sidebar-foot">A little Spanish.<br>A whole lot of adventure.<span>Made for curious minds.</span></div></aside>
  <div class="learn-main"><header class="learn-top"><div class="course"><span class="spanish-flag" aria-hidden="true"></span><strong>Spanish</strong><span class="course-level">BEGINNER</span></div><div class="learning-stats"><span class="orange" title="Daily learning streak">${icon('flame')} ${streak}</span><span class="blue" title="Total quiz XP">${icon('bolt')} ${profile.xp}</span><button class="avatar" id="profile-button" aria-label="View learning progress">${wizardArt('happy', true)}</button></div></header>
  <div class="home-dashboard">
    <section class="home-adventure"><div class="home-adventure-copy"><span class="card-eyebrow">LEARN A LITTLE. ADVENTURE A LOT.</span><h1>Your next adventure<br>starts with a word.</h1><p>Build your Spanish, choose your hero, and see what waits behind the next door.</p><button class="p-button purple-button" data-dungeon>${continuing?'CONTINUE ADVENTURE':'ENTER THE DUNGEON'} →</button><small>${continuing?'Room '+(run.depth+1)+' of 9 · your run is saved':'3 heroes · 3 dungeons · no timer'}</small></div><div class="home-party">${adventureHeroes()}${wizardArt()}</div></section>
    <section class="home-lessons home-path-entry"><div>${wizardArt()}</div><span class="card-eyebrow">YOUR SPANISH JOURNEY</span><h2>Follow your learning path.</h2><p>Nine short lessons. Practice words, build sentences, listen, and read your first story.</p><button class="p-button" id="open-learning-path">OPEN LEARNING PATH →</button><small>${Object.keys(profile.completed).filter(k=>lessons[k]).length} / ${Object.keys(lessons).length} lessons practiced</small><button class="home-word-chest" id="word-chest">${treasureArt()}<span><strong>Your word treasure</strong><small>${Object.keys(profile.words).length} discoveries</small></span><b>→</b></button></section>
    <aside class="home-side"><section class="quests-card"><div class="card-title"><h2>Daily quests</h2><span>TODAY</span></div>${quest('Finish a Spanish quiz',profile.daily.lessons,1,'book')}${quest('Get 5 answers right',profile.daily.correct,5,'check')}${quest('Earn 50 XP',profile.daily.xp,50,'bolt')}</section><section class="home-quick"><span class="card-eyebrow">KEEP YOUR MOMENTUM</span><h2>A quick practice round?</h2><p>10 questions. A little more confidence for your next encounter.</p><button class="p-button outline-blue" data-quiz="mixed">PRACTICE SPANISH →</button></section><div class="local-learning">Progress saved on this device</div></aside>
  </div></div>`;
  document.querySelectorAll('[data-dungeon]').forEach(b=>b.onclick=openDungeon);
  document.querySelectorAll('[data-quiz]').forEach(b=>{
    b.onclick=()=>lessonPreview(b.dataset.quiz);
    if(b.classList.contains('lesson-node') && profile.completed[b.dataset.quiz]){
      b.classList.add('completed');b.insertAdjacentHTML('beforeend','<span class="node-check" aria-label="Completed">✓</span>');
    }
  });
  $('nav-path').onclick=()=>go('path');$('open-learning-path').onclick=()=>go('path');
  $('nav-practice').onclick=practiceHub;
  $('nav-learn').onclick=()=>go('home');$('nav-words').onclick=showWords;$('word-chest').onclick=showWords;
  $('profile-button').onclick=()=>openModal(`<div class="modal-kicker">YOUR LEARNING SO FAR</div><h2>Look at you go!</h2><div class="quiz-summary"><div><strong>${profile.xp}</strong><span>TOTAL XP</span></div><div><strong>${profile.lessons}</strong><span>QUIZZES</span></div><div><strong>${Object.keys(profile.words).length}</strong><span>DISCOVERIES</span></div></div><p>Quiz progress is saved locally in this browser. Your dungeon adventure has its own save, so you can switch between both.</p>`);
}
function renderLearningPath() {
  const units=[{title:'Your first words',subtitle:'Meet useful words and start a conversation.',ids:['vocabulary','greetings','matching']},{title:'Make yourself understood',subtitle:'Build sentences and train your ear.',ids:['grammar','sentences','listening']},{title:'Spanish in everyday life',subtitle:'Order at a café, follow a story, and review.',ids:['food','stories','mixed']}];
  const count=Object.keys(lessons).filter(id=>profile.completed[id]).length;
  const next=units.flatMap(u=>u.ids).find(id=>!profile.completed[id]);
  pathScreen.innerHTML=`<header class="path-top"><button id="path-home">← Home</button><a href="#learning-path">Learning Path</a><span>🇪🇸 Spanish · Beginner</span><strong>${profile.xp} XP</strong></header><main class="path-main"><header class="path-intro"><div><span class="card-eyebrow">SMALL STEPS. REAL PROGRESS.</span><h1>Your Spanish learning path</h1><p>Words, conversations, listening, and stories. Start anywhere; revisit often.</p></div><div class="path-progress"><b>${count} / ${Object.keys(lessons).length}</b><span>lessons practiced</span></div></header><div class="path-columns"><div class="path-units">${units.map((unit,i)=>`<section class="path-unit"><header><div><small>SECTION 1 · UNIT ${i+1}</small><h2>${unit.title}</h2><p>${unit.subtitle}</p></div><button data-unit-guide="${i}" aria-label="Open guidebook for ${unit.title}">${icon('book')}<span>Guidebook</span></button></header><ol class="path-trail">${unit.ids.map((id,j)=>{const l=lessons[id],done=profile.completed[id];return `<li class="path-stop stop-${j}"><button class="path-node ${done?'complete':''} ${id===next?'next':''}" data-path-lesson="${id}" aria-label="${l.title}${done?', practiced':''}">${icon(done?'check':l.symbol)}</button><div><span>${done?'✓ PRACTICED':id===next?'UP NEXT':l.detail.split(' · ')[0].toUpperCase()}</span><h3>${l.title}</h3><p>${l.detail}</p></div></li>`;}).join('')}</ol></section>`).join('')}<button class="path-collection" id="path-words">${treasureArt()}<span><strong>Your word collection</strong><small>${Object.keys(profile.words).length} discoveries · review your words</small></span>→</button></div><aside class="path-coach">${wizardArt()}<h2>A little every day.</h2><p>Try one new lesson, then revisit a familiar one. Mistakes are part of learning.</p><div><b>Try different skills</b><p>Listen to a phrase, match its meaning, and use it in a sentence.</p></div><div><b>Your progress stays with you</b><p>Completed lessons and XP are saved in this browser.</p></div></aside></div></main>`;
  $('path-home').onclick=()=>go('home');$('path-words').onclick=showWords;
  pathScreen.querySelectorAll('[data-path-lesson]').forEach(b=>b.onclick=()=>lessonPreview(b.dataset.pathLesson));
  pathScreen.querySelectorAll('[data-unit-guide]').forEach(b=>b.onclick=()=>{const unit=units[+b.dataset.unitGuide];openModal(`<div class="modal-kicker">UNIT GUIDEBOOK</div><h2>${unit.title}</h2>${unit.ids.map(id=>`<div class="lesson-tip"><h3>${lessons[id].title}</h3><b>${esc(lessons[id].example)}</b><p>${esc(lessons[id].tip)}</p></div>`).join('')}`);});
}
function renderMatching(q,checked) {
  $('quiz-answers').innerHTML=`<div class="matching-grid"><div>${q.pairs.map((p,i)=>`<button class="match-tile ${matchLeft===i?'selected':''}" data-match-left="${i}" aria-pressed="${matchLeft===i}" lang="es" ${checked||matched.includes(i)?'disabled':''}>${esc(p.es)}${matched.includes(i)?' ✓':''}</button>`).join('')}</div><div>${q.options.map(en=>{const i=q.pairs.findIndex(p=>p.en===en);return `<button class="match-tile" data-match-right="${i}" ${checked||matched.includes(i)?'disabled':''}>${esc(en)}${matched.includes(i)?' ✓':''}</button>`;}).join('')}</div></div><p class="match-status" role="status">${matched.length} / ${q.pairs.length} pairs connected.${matchErrors?' Keep trying—mistakes help you learn.':''}</p>`;
  document.querySelectorAll('[data-match-left]').forEach(b=>b.onclick=()=>{matchLeft=+b.dataset.matchLeft;renderQuiz();});
  document.querySelectorAll('[data-match-right]').forEach(b=>b.onclick=()=>{if(matchLeft===null){$('quiz-answers').querySelector('.match-status').textContent='Choose a Spanish word first.';return;}if(matchLeft===+b.dataset.matchRight)matched.push(matchLeft);else matchErrors++;matchLeft=null;renderQuiz();});
}

function openModal(html) { document.body.append($('modal')); $('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal(); }
function showWords() {
  const entries=Object.entries(profile.words);
  openModal(`<div class="modal-kicker">YOUR WORD COLLECTION</div><h2>A little wiser, every lesson.</h2><p>${entries.length?'Here’s what you’ve practiced in Spanish quizzes.':'Finish a Spanish quiz to start your collection. Your dungeon discoveries live in its journal.'}</p>${entries.map(([id,data])=>{const q=allLearningQuestions.find(q=>q.id===id);return q?`<div class="journal-row"><div><strong>${esc(q.type==='order'?q.answer:q.es)}</strong><p>${esc(q.explanation)}</p></div><span>${data.correct?'✓ Learned':'↻ Practice'}</span></div>`:'';}).join('')}`);
}
function award() {
  if(awarded)return;awarded=true;refreshDay();const score=quizScore(quiz);
  profile.completed[quiz.mode]=(profile.completed[quiz.mode]||0)+1;
  profile.xp+=score.xp;profile.lessons++;profile.daily.xp+=score.xp;profile.daily.lessons++;profile.daily.correct+=score.correct;
  if(profile.lastDay!==today()){const d=new Date();d.setDate(d.getDate()-1);const yesterday=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;profile.streak=profile.lastDay===yesterday?profile.streak+1:1;profile.lastDay=today();}
  quiz.answers.forEach(a=>profile.words[a.id]={correct:a.correct});saveProfile();
}
function renderQuiz() {
  if(quiz.phase==='complete'){award();renderResults();return;}
  const q=quiz.deck[quiz.index],checked=quiz.phase==='feedback',result=quiz.answers.at(-1),correct=checked&&result.correct;
  $('quiz-screen').innerHTML=`<header class="quiz-header"><button class="quiz-close" id="quiz-exit" aria-label="Exit quiz">${icon('close')}</button><div class="lesson-progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${quiz.deck.length}" aria-valuenow="${quiz.answers.length}"><span style="width:${quiz.answers.length/quiz.deck.length*100}%"></span></div><span class="quiz-count">${quiz.index+1} / ${quiz.deck.length}</span></header><main class="quiz-body"><div class="quiz-category">${q.type==='matching'?'MATCHING':q.lessonType==='listening'?'LISTENING':q.lessonType==='reading'?'SHORT STORY':q.lessonType==='conversation'?'CONVERSATION':q.type==='order'?'BUILD A SENTENCE':q.id.startsWith('g')?'COMPLETE THE SENTENCE':'TRANSLATE THE WORD'}</div><h1>${q.type==='matching'?'Match the pairs':q.lessonType==='listening'?'Tap what you hear':q.lessonType==='reading'?esc(q.prompt):q.lessonType==='conversation'?'Choose the best response':q.type==='order'?'Write this in Spanish':q.id.startsWith('g')?'Fill in the blank':'Select the correct meaning'}</h1><div class="quiz-prompt"><div class="quiz-mage">${wizardArt(checked&&!correct?'thinking':'happy')}</div><div class="speech-bubble">${q.type!=='order'&&q.type!=='matching'&&q.lessonType!=='conversation'?`<button class="quiz-sound" id="quiz-sound" aria-label="Listen to Spanish">${icon('sound')}</button>`:''}<span ${q.type!=='order'&&q.type!=='matching'&&q.lessonType!=='conversation'&&!(q.lessonType==='listening'&&!transcript&&!checked)?'lang="es"':''}>${esc(q.lessonType==='listening'&&!transcript&&!checked?'Listen, then choose your answer.':q.type==='order'?q.prompt.replace('Build the Spanish for “','').replace('”',''):q.es).replace('___','<span class="quiz-blank">_____</span>')}</span></div></div>${q.lessonType==='listening'?'<div class="listening-tools"><button id="listen-slow">Listen slowly</button><button id="show-transcript">Show transcript / no audio</button></div>':''}<div id="quiz-answers"></div></main><footer class="quiz-bottom ${checked?(correct?'is-correct':'is-wrong'):''}"><div class="quiz-bottom-inner"><div id="quiz-feedback" role="status">${checked?`<span class="feedback-round">${icon(correct?'check':'close')}</span><div><h2>${correct?(quiz.answers.slice(-3).length===3&&quiz.answers.slice(-3).every(a=>a.correct)?'Three in a row!':'Nicely done!'):'Let’s learn this one'}</h2><p>${correct?esc(q.explanation):`Correct answer: <b>${esc(q.type==='matching'?'Connect each Spanish word to its English meaning':q.answer)}</b><br>${esc(q.explanation)}`}</p></div>`:`<span class="quiz-reminder">${q.type==='matching'?'Match all four pairs':q.type==='order'?'Tap words to build your answer':'<kbd>1–4</kbd> choose an answer'} <span>·</span> <kbd>ENTER</kbd> check</span>`}</div><button class="p-button ${checked&&!correct?'red-button':''}" id="quiz-check" ${!checked&&(q.type==='matching'?matched.length!==q.pairs.length:choice===null&&tokens.length!==q.options.length)?'disabled':''}>${checked?'CONTINUE':'CHECK'}</button></div></footer>`;
  const area=$('quiz-answers');
  if(q.type==='matching'){renderMatching(q,checked);}
  else if(q.type==='order'){
    area.innerHTML=`<div class="quiz-sentence" lang="es" aria-label="Your answer">${!tokens.length?'<span class="sentence-placeholder">Tap the words below to build your answer</span>':''}${tokens.map((i,pos)=>`<button class="word-tile" data-remove-word="${pos}" ${checked?'disabled':''}>${esc(q.options[i])}</button>`).join('')}</div><div class="quiz-word-bank">${q.options.map((w,i)=>`<button class="word-tile" data-word="${i}" lang="es" ${checked||tokens.includes(i)?'disabled':''}>${esc(w)}</button>`).join('')}</div>`;
    document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>{tokens.push(+b.dataset.word);renderQuiz();});
    document.querySelectorAll('[data-remove-word]').forEach(b=>b.onclick=()=>{tokens.splice(+b.dataset.removeWord,1);renderQuiz();});
  }else{
    area.innerHTML=`<div class="quiz-options">${q.options.map((o,i)=>`<button class="quiz-option ${checked&&choice===i&&!correct?'wrong-option':''} ${choice===i?'selected':''} ${checked&&o===q.answer?'correct-option':''}" data-option="${i}" aria-pressed="${choice===i}" ${checked?'disabled':''}><span>${i+1}</span>${esc(o)}</button>`).join('')}</div>`;
    document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{choice=+b.dataset.option;renderQuiz();document.querySelector(`[data-option="${choice}"]`)?.focus({preventScroll:true});});
  }
  $('quiz-exit').onclick=exitQuiz;
  const speakQuestion=rate=>{if(!('speechSynthesis' in window)){transcript=true;renderQuiz();return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance((q.spoken||q.es).replace('___','…'));u.lang='es-ES';u.rate=rate;u.onerror=()=>{if(quiz?.deck[quiz.index]?.id===q.id&&!transcript){transcript=true;renderQuiz();}};speechSynthesis.speak(u);};
  if($('quiz-sound'))$('quiz-sound').onclick=()=>speakQuestion(.85);
  if($('listen-slow'))$('listen-slow').onclick=()=>speakQuestion(.6);
  if($('show-transcript'))$('show-transcript').onclick=()=>{transcript=true;renderQuiz();};
  $('quiz-check').onclick=()=>{
    if(quiz.phase==='answer'){const value=q.type==='matching'?(matchErrors?'needs-review':'matched'):q.type==='order'?tokens.map(i=>q.options[i]).join(' '):q.options[choice];if(value===undefined||(q.type==='order'&&tokens.length!==q.options.length))return;checkQuiz(quiz,value);}
    else{nextQuiz(quiz);choice=null;tokens=[];matched=[];matchErrors=0;matchLeft=null;transcript=false;}
    renderQuiz();
    if(quiz.phase==='answer'){
      const heading=document.querySelector('.quiz-body h1');heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});window.scrollTo(0,0);
    }else{
      const justChecked=quiz.answers.at(-1);
      if(justChecked&&!justChecked.correct){
        // A peer review flagged missing this on the wrong-answer path.
        // It was already there -- but focus went straight to Continue,
        // same as a correct answer, so a learner moving quickly could
        // press Enter again and skip past it without ever registering
        // it. Put focus on the explanation itself instead, so the next
        // keystroke has to land there first. Enter still works to
        // continue either way -- the global keydown handler calls
        // quiz-check.click() directly, it does not depend on what has
        // focus -- this only changes where a learner's eye and next
        // keystroke naturally go.
        const feedbackHeading=document.querySelector('#quiz-feedback h2');
        feedbackHeading?.setAttribute('tabindex','-1');
        feedbackHeading?.focus({preventScroll:true});
      }else $('quiz-check')?.focus({preventScroll:true});
    }
  };
}
function exitQuiz(){if(quiz.phase==='complete')return go(lessonReturn);openModal('<h2>Leave this lesson?</h2><p>Your completed quizzes are safe. This unfinished quiz will not earn XP.</p><div class="exit-actions"><button class="p-button" id="keep-learning">KEEP LEARNING</button><button class="p-button outline-blue" id="leave-quiz">LEAVE LESSON</button></div>');$('keep-learning').onclick=()=>$('modal').close();$('leave-quiz').onclick=()=>go(lessonReturn);}
function renderResults(){const score=quizScore(quiz);$('quiz-screen').innerHTML=`<main class="quiz-results"><div class="celebration" aria-hidden="true">${Array.from({length:14},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="result-trophy">${icon('trophy')}</div><h1>${score.correct===score.total?'Perfect lesson!':'Lesson complete!'}</h1><p>A little practice. A little more Spanish.<br>One short lesson at a time.</p><div class="quiz-summary"><div class="xp-result"><span>TOTAL XP</span><strong>${icon('bolt')} ${score.xp}</strong></div><div class="accuracy-result"><span>ACCURACY</span><strong>${Math.round(score.correct/score.total*100)}%</strong></div><div class="score-result"><span>CORRECT</span><strong>${score.correct} / ${score.total}</strong></div></div><button class="text-link" id="review-quiz">${review?'HIDE':'REVIEW'} YOUR ANSWERS</button>${review?`<div class="quiz-review">${quiz.answers.map((a,i)=>`<div><span class="${a.correct?'green-text':'red-text'}">${a.correct?'✓':'✕'}</span><p><b>${esc(quiz.deck[i].es)}</b><br>${esc(quiz.deck[i].answer)}<small>${esc(quiz.deck[i].explanation)}</small></p></div>`).join('')}</div>`:''}</main><footer class="quiz-bottom"><div class="quiz-bottom-inner result-actions"><button class="p-button outline-blue" id="repeat-lesson">PRACTICE AGAIN</button><button class="p-button" id="quiz-home">BACK TO MY PATH</button></div></footer>`;$('review-quiz').onclick=()=>{review=!review;renderResults();};$('repeat-lesson').onclick=()=>{const back=lessonReturn;startQuiz(quiz.mode);lessonReturn=back;};$('quiz-home').onclick=()=>go('path');}

$('game-home').onclick=()=>go('home');
$('hero-back').onclick=()=>go('home');
document.addEventListener('keydown',e=>{if(document.body.dataset.view!=='quiz'||$('modal').open||e.ctrlKey||e.metaKey||e.altKey||!quiz||quiz.phase==='complete')return;if(e.key==='Enter'){e.preventDefault();$('quiz-check')?.click();}else if(quiz.phase==='answer'&&/^[1-4]$/.test(e.key))document.querySelector(`[data-option="${+e.key-1}"]`)?.click();});
window.addEventListener('popstate',()=>go(location.hash==='#learning-path'?'path':'home',false));
go(location.hash==='#learning-path'?'path':'home',false);
