import { tva , isWeb } from '@gluestack-ui/utils/nativewind-utils';

const baseStyle = isWeb ? 'flex flex-col relative z-0' : '';

export const cardStyle = tva({
  base: `${baseStyle} flex-col bg-card border border-border/60 rounded-3xl shadow-sm dark:shadow-indigo-950/10`,
  variants: {
    size: {
      default: 'p-4 gap-4',
      sm: 'p-3 gap-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
