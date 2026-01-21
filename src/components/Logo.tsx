import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div className={cn('font-semibold tracking-tight', sizeClasses[size], className)}>
      <span className="text-white">Qim</span>
      <span className="text-[#82c91e]">tek</span>
    </div>
  );
}
