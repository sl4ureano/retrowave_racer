export function calculatePlayerPosition(distance, raceRivals){
  return 1 + raceRivals.filter(rival => rival.progress > distance + 8).length;
}
