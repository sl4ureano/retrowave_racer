export function createKeyState(){
  return {};
}

export function bindKeyboard(keys){
  addEventListener('keydown', event => {
    keys[event.code] = true;
  });

  addEventListener('keyup', event => {
    keys[event.code] = false;
  });
}

export function bindMobileButtons(keys){
  document.querySelectorAll('.mBtn').forEach(button => {
    const code = button.dataset.key;

    const down = event => {
      event.preventDefault();
      keys[code] = true;
    };

    const up = event => {
      event.preventDefault();
      keys[code] = false;
    };

    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('pointerleave', up);
  });
}
