import { cn } from '@/lib/utils';

interface GradeBadgeProps {
  grade: string;
  size?: 'sm' | 'md' | 'lg';
}

export function GradeBadge({ grade, size = 'md' }: GradeBadgeProps) {
  const colors = {
    'A+': 'bg-green-100 text-green-800 border-green-200',
    A: 'bg-green-50 text-green-700 border-green-200',
    B: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    C: 'bg-orange-100 text-orange-800 border-orange-200',
    D: 'bg-red-100 text-red-800 border-red-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-md border',
        colors[grade as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200',
        sizes[size]
      )}
    >
      {grade}
    </span>
  );
}
