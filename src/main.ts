import { Game } from './core/Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const startScreen = document.getElementById('start-screen')!;
const gameoverScreen = document.getElementById('gameover-screen')!;
const nameInput = document.getElementById('player-name') as HTMLInputElement;
const playBtn = document.getElementById('play-btn')!;
const restartBtn = document.getElementById('restart-btn')!;
const goKiller = document.getElementById('go-killer')!;
const goTerritoryVal = document.getElementById('go-territory-val')!;
const goKillsVal = document.getElementById('go-kills-val')!;

const game = new Game(canvas);

game.setOnDeath((killerName, territory, kills) => {
  goKiller.textContent = killerName ? `Killed by: ${killerName}` : 'You went out of bounds';
  goTerritoryVal.textContent = `${territory}%`;
  goKillsVal.textContent = String(kills);
  gameoverScreen.classList.remove('hidden');
});

playBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'Player';
  startScreen.classList.add('hidden');
  game.start(name);
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') playBtn.click();
});

restartBtn.addEventListener('click', () => {
  gameoverScreen.classList.add('hidden');
  const name = nameInput.value.trim() || 'Player';
  game.restart(name);
});

// Focus name input on load
nameInput.focus();
