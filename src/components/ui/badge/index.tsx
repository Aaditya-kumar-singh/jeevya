'use client';
import { PrimitiveIcon, UIIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { styled } from 'nativewind';
import React from 'react';
import { Text, View } from 'react-native';
import { Svg } from 'react-native-svg';

const SCOPE = 'BADGE';

const badgeStyle = tva({
  base: 'flex-row items-center justify-center rounded-full px-3 py-1 border',
  variants: {
    variant: {
      default: 'bg-indigo-500/15 border-indigo-500/30',
      secondary: 'bg-violet-500/15 border-violet-500/30',
      destructive: 'bg-rose-500/15 border-rose-500/30',
      outline: 'bg-emerald-500/15 border-emerald-500/30',
    },
  },
});

const badgeTextStyle = tva({
  base: 'text-xs font-bold tracking-wider',
  parentVariants: {
    variant: {
      default: 'text-indigo-600 dark:text-indigo-400',
      secondary: 'text-violet-600 dark:text-violet-400',
      destructive: 'text-rose-600 dark:text-rose-400',
      outline: 'text-emerald-600 dark:text-emerald-400',
    },
  },
});

const badgeIconStyle = tva({
  base: 'fill-none h-3 w-3 pointer-events-none',
  parentVariants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
    },
  },
});

const ContextView = withStyleContext(View, SCOPE);

type IBadgeProps = React.ComponentPropsWithoutRef<typeof ContextView> &
  VariantProps<typeof badgeStyle>;
function Badge({
  children,
  variant = 'default',
  className,
  ...props
}: { className?: string } & IBadgeProps) {
  return (
    <ContextView
      className={badgeStyle({ variant, class: className })}
      {...props}
      context={{ variant }}
    >
      {children}
    </ContextView>
  );
}

type IBadgeTextProps = React.ComponentPropsWithoutRef<typeof Text> &
  VariantProps<typeof badgeTextStyle>;

const BadgeText = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IBadgeTextProps
>(function BadgeText({ children, className, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <Text
      ref={ref}
      className={badgeTextStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
    >
      {children}
    </Text>
  );
});

type IBadgeIconProps = React.ComponentPropsWithoutRef<typeof PrimitiveIcon> &
  VariantProps<typeof badgeIconStyle> & {
    size?: number;
};
  
const StyledUIIcon = styled(UIIcon, {
  className: 'style',
});


const BadgeIcon = React.forwardRef<
  React.ComponentRef<typeof Svg>,
  IBadgeIconProps
>(function BadgeIcon({ className, size, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);

  if (typeof size === 'number') {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props?.height !== undefined || props?.width !== undefined) &&
    size === undefined
  ) {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
      />
    );
  }
  return (
    <StyledUIIcon
      className={badgeIconStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
      ref={ref}
    />
  );
});

Badge.displayName = 'Badge';
BadgeText.displayName = 'BadgeText';
BadgeIcon.displayName = 'BadgeIcon';

export { Badge, BadgeIcon, BadgeText };
