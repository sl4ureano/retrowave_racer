export function updateVolumeLabel(id, value){
  const label = document.getElementById(id);
  if (label) label.textContent = `${Number(value)}%`;
}

export function bindRange(id, callback){
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', event => callback(event.target.value));
}
