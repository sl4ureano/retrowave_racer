const TRACKS = {
  miami: './src/audio/Ocean_Drive.ogg',
  rio: './src/audio/Garota_de_Ipanema.ogg'
};

const players = {};
let currentMap = null;
let volume = 0.55;

function getPlayer(map){
  const key = TRACKS[map] ? map : 'miami';

  if (!players[key]) {
    const audio = new Audio(TRACKS[key]);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = volume;
    players[key] = audio;
  }

  return players[key];
}

export function setMusicVolume(value){
  volume = Math.max(0, Math.min(1, Number(value) / 100));

  Object.values(players).forEach(audio => {
    audio.volume = volume;
    if (volume === 0) audio.muted = true;
    else audio.muted = false;
  });
}

export function setMapMusic(map, force=false){
  if (!force && currentMap === map) return;

  Object.values(players).forEach(audio => {
    audio.pause();
  });

  currentMap = TRACKS[map] ? map : 'miami';

  const audio = getPlayer(currentMap);
  audio.volume = volume;
  audio.muted = volume === 0;
  audio.currentTime = 0;

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      // O navegador pode bloquear autoplay até o primeiro clique.
      // A música será iniciada na próxima chamada disparada por interação do usuário.
    });
  }
}

export function pauseMapMusic(){
  Object.values(players).forEach(audio => audio.pause());
}
