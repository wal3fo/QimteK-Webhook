import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16',
  };

  return (
    <img
      src="/QimteKw.png"
      alt="QimteK Logo"
      className={cn('object-contain', sizeClasses[size], className)}
    />
  );
}
