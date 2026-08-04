import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  /** Use 'offline' variant for connection-lost scenarios. */
  variant?: 'error' | 'offline';
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'error',
  className,
}: ErrorStateProps) {
  const Icon = variant === 'offline' ? WifiOff : AlertCircle;
  const iconBg = variant === 'offline' ? 'bg-muted' : 'bg-destructive/10';
  const iconColor = variant === 'offline' ? 'text-muted-foreground' : 'text-destructive';

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center gap-4', className)}>
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center', iconBg)}>
        <Icon className={cn('w-6 h-6', iconColor)} />
      </div>
      <div className="max-w-sm">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {message && (
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
