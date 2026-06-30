export function updateRaceHud(position, elements, distance, raceRivals){
  const { posBigEl, rankingNamesEl } = elements;

  if (posBigEl) posBigEl.textContent = `${position}º / 7`;

  if (rankingNamesEl) {
    const board = [
      { name:'Você', progress:distance },
      ...raceRivals.map(rival => ({ name:rival.name, progress:rival.progress }))
    ].sort((a, b) => b.progress - a.progress);

    rankingNamesEl.textContent = board
      .slice(0, 3)
      .map((racer, index) => `${index + 1}º ${racer.name}`)
      .join('  •  ');
  }
}
