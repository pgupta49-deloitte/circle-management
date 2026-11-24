const colors = ['sage', 'lavender', 'peach', 'blue', 'rose', 'gold'];

function getColorIndex(name = '') {
  return [...name].reduce((total, character) => total + character.charCodeAt(0), 0) % colors.length;
}

export function Avatar({ name = '', size = 'medium' }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className={`avatar avatar--${colors[getColorIndex(name)]} avatar--${size}`}
      aria-label={name || 'User'}
      role="img"
    >
      {initials || '?'}
    </span>
  );
}
