export function bindChoiceGroup(selector, getValue, onChange){
  document.querySelectorAll(selector).forEach(choice => {
    choice.addEventListener('click', () => {
      const value = getValue(choice);
      document.querySelectorAll(selector).forEach(item => {
        item.classList.toggle('active', item === choice);
      });
      onChange(value, choice);
    });
  });
}

export function hideMenu(menu){
  menu?.classList.add('hide');
}

export function showMenu(menu){
  menu?.classList.remove('hide');
}
