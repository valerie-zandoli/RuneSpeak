// Authored beginner Spanish. Each distractor is distinct; explanations teach after every answer.
const vocabulary = [
 ['la llave','the key','Keys open doors. La llave = the key.'],['la puerta','the door','La puerta = the door. Abrir la puerta means to open the door.'],['el agua','water','Agua is feminine, but uses el directly before its stressed initial a: el agua fría.'],['el fuego','fire','El fuego = fire. A useful word near a dungeon torch.'],['el libro','the book','El libro = the book. Books hold the words you need.'],['la espada','the sword','La espada = the sword.'],['el tesoro','the treasure','El tesoro = the treasure.'],['la noche','the night','La noche = the night. Buenas noches means good evening or good night.'],['el amigo','the friend','El amigo = a male friend; la amiga = a female friend.'],['la casa','the house','La casa = the house.'],['el camino','the path','El camino = the path or way.'],['la luz','the light','La luz = the light.'],['el bosque','the forest','El bosque = the forest.'],['la piedra','the stone','La piedra = the stone.'],['el corazón','the heart','El corazón = the heart. The accent marks the stressed final syllable.'],['la vida','life','La vida = life.'],['el pan','bread','El pan = bread.'],['la ventana','the window','La ventana = the window.'],['el gato','the cat','El gato = the cat.'],['el perro','the dog','El perro = the dog.'],['rojo','red','Rojo = red; roja is the feminine form.'],['verde','green','Verde = green. It has the same form for masculine and feminine nouns.'],['grande','big','Grande = big. It has the same form for masculine and feminine nouns.'],['pequeño','small','Pequeño = small; pequeña is the feminine form.'],['izquierda','left','A la izquierda = to the left.'],['derecha','right','A la derecha = to the right.'],['abrir','to open','Abrir = to open.'],['buscar','to search for','Buscar = to look for or search for.'],['correr','to run','Correr = to run.'],['escuchar','to listen','Escuchar = to listen.'],['comer','to eat','Comer = to eat.'],['beber','to drink','Beber = to drink.']
];
export const questions = vocabulary.map(([es,en,explanation],i)=>({id:`v${i}`,type:'choice',category:'Word magic',prompt:'What does this word mean?',es,answer:en,options:[en,...[7,13,19].map(n=>vocabulary[(i+n)%vocabulary.length][1])],explanation}));
const grammar=[
 ['Yo ___ español.','hablo',['hablas','habla','hablan'],'With yo (I), hablar becomes hablo: I speak Spanish.','Yo hablo español.'],
 ['Tú ___ una llave.','tienes',['tengo','tiene','tenemos'],'Tú tienes means you have. Tener changes its stem to tien- here.','Tú tienes una llave.'],
 ['La puerta ___ abierta.','está',['es','estoy','están'],'Use estar for the state of the door: la puerta está abierta = the door is open.','La puerta está abierta.'],
 ['Nosotros ___ agua.','bebemos',['bebo','beben','bebes'],'Nosotros bebemos = we drink. The nosotros ending of beber is -emos.','Nosotros bebemos agua.'],
 ['El libro es ___.','rojo',['roja','rojas','rojos'],'Libro is masculine singular, so the adjective is rojo.','El libro es rojo.'],
 ['Hay dos ___.','puertas',['puerta','puerto','puertos'],'Dos means two. Use the plural puertas: there are two doors.','Hay dos puertas.'],
 ['Ella ___ en el bosque.','está',['estoy','estás','están'],'Ella está = she is. Use estar for location.','Ella está en el bosque.'],
 ['___ llamo Ana.','Me',['Te','Se','Nos'],'Me llamo Ana = my name is Ana. Literally, I call myself Ana.','Me llamo Ana.'],
 ['Quiero ___ pan.','comer',['como','comes','comen'],'After quiero (I want), use the infinitive: comer (to eat).','Quiero comer pan.'],
 ['Los gatos ___ pequeños.','son',['es','soy','eres'],'Los gatos is plural, so use son: the cats are small.','Los gatos son pequeños.'],
 ['¿Dónde ___ la llave?','está',['están','estás','estoy'],'¿Dónde está la llave? = Where is the key? Use está for a singular object’s location.','¿Dónde está la llave?'],
 ['Yo ___ un aventurero.','soy',['eres','somos','son'],'Yo soy = I am. Use ser for identity: I am an adventurer.','Yo soy un aventurero.']
];
grammar.forEach(([es,answer,wrong,explanation,spoken],i)=>questions.push({id:`g${i}`,type:'choice',category:'Rune grammar',prompt:'Complete the inscription.',es,answer,options:[answer,...wrong],explanation,spoken}));
[
 ['I need a key.','Necesito una llave','Necesito = I need; una llave = a key.'],
 ['The door is open.','La puerta está abierta','Estar describes a state: está abierta = is open.'],
 ['I have three coins.','Tengo tres monedas','Tengo = I have; tres monedas = three coins.'],
 ['Where is the treasure?','Dónde está el tesoro','¿Dónde está el tesoro? = Where is the treasure?'],
 ['We are friends.','Somos amigos','Somos = we are; amigos = friends.'],
 ['I want to drink water.','Quiero beber agua','Quiero + infinitive: I want to do something.'],
 ['The forest is big.','El bosque es grande','Use ser to describe a characteristic: es grande = is big.'],
 ['Good morning, friend.','Buenos días amigo','Buenos días is the standard morning greeting.']
].forEach(([prompt,answer,explanation],i)=>questions.push({id:`s${i}`,type:'order',category:'Spell weaving',prompt:`Build the Spanish for “${prompt}”`,es:'Put the words in order',answer,options:answer.split(' '),explanation,spoken:answer}));
