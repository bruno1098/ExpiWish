import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100',
        // Adicionando variantes específicas para problemas
        problem: 'border-gray-200 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
        "sem-problemas": 'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-800/30 dark:text-green-300',
        "atendimento-ruim": 'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-800/30 dark:text-red-300',
        "atendimento-lento": 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-800/30 dark:text-orange-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// Definir um tipo específico para as variantes do Badge
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'problem' | 'sem-problemas' | 'atendimento-ruim' | 'atendimento-lento';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof badgeVariants>, 'variant'> {
  variant?: BadgeVariant | string;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  // Converter a string para o tipo esperado usando type assertion
  const safeVariant = variant as BadgeVariant | undefined;
  
  // Detecção de problemas específicos para aplicar variantes corretas
  const text = props.children?.toString()?.toLowerCase() || '';
  let resolvedVariant = safeVariant;
  
  if (text.includes('sem problemas')) {
    resolvedVariant = 'sem-problemas';
  } else if (text.includes('atendimento ruim')) {
    resolvedVariant = 'atendimento-ruim';
  } else if (text.includes('atendimento lento')) {
    resolvedVariant = 'atendimento-lento';
  } else if (className?.includes('bg-red') || text.includes('quarto pequeno') || text.includes('barulho')) {
    className = cn(className, 'dark:border-red-800 dark:bg-red-800/30 dark:text-red-300');
  } else if (className?.includes('bg-yellow') || className?.includes('bg-orange')) {
    className = cn(className, 'dark:border-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-300');
  } else if (className?.includes('bg-blue')) {
    className = cn(className, 'dark:border-blue-800 dark:bg-blue-800/30 dark:text-blue-300');
  } else if (className?.includes('bg-green')) {
    className = cn(className, 'dark:border-green-800 dark:bg-green-800/30 dark:text-green-300');
  } else if (className?.includes('bg-purple')) {
    className = cn(className, 'dark:border-purple-800 dark:bg-purple-800/30 dark:text-purple-300');
  }
  
  return (
    <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
