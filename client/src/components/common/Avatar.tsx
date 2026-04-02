import './common.css';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, color, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

  return (
    <span
      className={`avatar avatar--${size} ${className}`.trim()}
      style={{ backgroundColor: color }}
      data-tooltip={name}
      data-tooltip-pos="bottom"
    >
      {initials}
    </span>
  );
}
