import React from 'react';
import { EmailCategory } from '../../types';

interface CategoryBadgeProps {
  category?: EmailCategory;
  size?: 'sm' | 'md';
  onClick?: () => void;
  selected?: boolean;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = 'md',
  onClick,
  selected = false,
}) => {
  if (!category) return null;

  const color = category.color || 'var(--accent-lavender)';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-all ${
        onClick ? 'cursor-pointer hover:opacity-90 active:scale-95' : 'cursor-default'
      } ${
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs'
      } ${selected ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        backgroundColor: `${color}25`, // 15% opacity tint
        color: '#292D1E', // readable olive text
        border: `1px solid ${color}80`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span>{category.name}</span>
    </button>
  );
};

export const SenderAvatar: React.FC<{
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, color = '#C8B8D8', size = 'md' }) => {
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shrink-0 select-none ${sizeClasses}`}
      style={{
        backgroundColor: color,
        color: '#292D1E', // readable contrast dark olive
        border: '1px solid rgba(116, 121, 90, 0.25)',
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
};
