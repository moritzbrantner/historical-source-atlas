import { cva } from 'class-variance-authority';

export { Button } from '@moritzbrantner/ui/components/stable/button';

export const buttonVariants = cva(
  "inline-flex shrink-0 origin-bottom transform-gpu items-center justify-center gap-[var(--ui-control-gap)] whitespace-nowrap rounded-[var(--ui-button-radius,var(--ui-radius-control))] text-sm font-medium outline-none transition-[transform,box-shadow,background-color,color,border-color,filter] duration-150 ease-out will-change-transform hover:translate-y-[var(--ui-motion-hover-y)] hover:scale-[var(--ui-motion-hover-scale)] active:brightness-110 disabled:pointer-events-none disabled:opacity-50 aria-[pressed=true]:translate-y-[var(--ui-motion-hover-y)] aria-[pressed=true]:scale-[var(--ui-motion-hover-scale)] data-[selected=true]:translate-y-[var(--ui-motion-hover-y)] data-[selected=true]:scale-[var(--ui-motion-hover-scale)] data-[state=on]:translate-y-[var(--ui-motion-hover-y)] data-[state=on]:scale-[var(--ui-motion-hover-scale)] data-[keyboard-active=true]:scale-[0.98] data-[keyboard-active=true]:brightness-110 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-[var(--ui-focus-ring-width)] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[var(--ui-shadow-interactive)] hover:bg-primary/90 hover:shadow-[var(--ui-shadow-interactive)] active:bg-primary active:shadow-[var(--ui-shadow-interactive)] aria-[pressed=true]:bg-primary/90 aria-[pressed=true]:shadow-[var(--ui-shadow-interactive)] data-[selected=true]:bg-primary/90 data-[selected=true]:shadow-[var(--ui-shadow-interactive)] data-[state=on]:bg-primary/90 data-[state=on]:shadow-[var(--ui-shadow-interactive)] data-[keyboard-active=true]:bg-primary data-[keyboard-active=true]:shadow-[var(--ui-shadow-interactive)]',
        destructive:
          'bg-destructive text-white shadow-[var(--ui-shadow-interactive)] hover:bg-destructive/90 hover:shadow-[var(--ui-shadow-interactive)] active:bg-destructive active:shadow-[var(--ui-shadow-interactive)] focus-visible:ring-destructive/20 aria-[pressed=true]:bg-destructive/90 aria-[pressed=true]:shadow-[var(--ui-shadow-interactive)] data-[selected=true]:bg-destructive/90 data-[selected=true]:shadow-[var(--ui-shadow-interactive)] data-[state=on]:bg-destructive/90 data-[state=on]:shadow-[var(--ui-shadow-interactive)] data-[keyboard-active=true]:bg-destructive data-[keyboard-active=true]:shadow-[var(--ui-shadow-interactive)] dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-[var(--ui-shadow-interactive)] hover:bg-accent hover:text-accent-foreground hover:shadow-[var(--ui-shadow-interactive)] active:bg-accent active:text-accent-foreground active:shadow-[var(--ui-shadow-interactive)] aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground aria-[pressed=true]:shadow-[var(--ui-shadow-interactive)] data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:shadow-[var(--ui-shadow-interactive)] data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-[var(--ui-shadow-interactive)] data-[keyboard-active=true]:bg-accent data-[keyboard-active=true]:text-accent-foreground data-[keyboard-active=true]:shadow-[var(--ui-shadow-interactive)] dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:active:bg-input',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[var(--ui-shadow-interactive)] hover:bg-secondary/80 hover:shadow-[var(--ui-shadow-interactive)] active:bg-secondary active:shadow-[var(--ui-shadow-interactive)] aria-[pressed=true]:bg-secondary/80 aria-[pressed=true]:shadow-[var(--ui-shadow-interactive)] data-[selected=true]:bg-secondary/80 data-[selected=true]:shadow-[var(--ui-shadow-interactive)] data-[state=on]:bg-secondary/80 data-[state=on]:shadow-[var(--ui-shadow-interactive)] data-[keyboard-active=true]:bg-secondary data-[keyboard-active=true]:shadow-[var(--ui-shadow-interactive)]',
        ghost:
          'shadow-none hover:bg-accent hover:text-accent-foreground hover:shadow-[0_14px_28px_-20px_rgb(15_23_42_/_0.28)] active:bg-accent active:text-accent-foreground active:shadow-[0_8px_18px_-16px_rgb(15_23_42_/_0.2)] aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground aria-[pressed=true]:shadow-[0_14px_28px_-20px_rgb(15_23_42_/_0.28)] data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:shadow-[0_14px_28px_-20px_rgb(15_23_42_/_0.28)] data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-[0_14px_28px_-20px_rgb(15_23_42_/_0.28)] data-[keyboard-active=true]:bg-accent data-[keyboard-active=true]:text-accent-foreground data-[keyboard-active=true]:shadow-[0_8px_18px_-16px_rgb(15_23_42_/_0.2)] dark:hover:bg-accent/50 dark:active:bg-accent',
        link: 'text-primary underline-offset-4 shadow-none hover:translate-y-0 hover:scale-100 hover:underline hover:shadow-none active:text-primary active:shadow-none aria-[pressed=true]:translate-y-0 aria-[pressed=true]:scale-100 aria-[pressed=true]:underline aria-[pressed=true]:shadow-none data-[selected=true]:translate-y-0 data-[selected=true]:scale-100 data-[selected=true]:underline data-[selected=true]:shadow-none data-[state=on]:translate-y-0 data-[state=on]:scale-100 data-[state=on]:underline data-[state=on]:shadow-none data-[keyboard-active=true]:text-primary data-[keyboard-active=true]:shadow-none',
      },
      size: {
        default:
          'h-[var(--ui-button-height-md,var(--ui-control-height-md))] px-[var(--ui-button-padding-x-md,var(--ui-control-padding-x-md))] py-2 has-[>svg]:px-[var(--ui-button-padding-x-sm,var(--ui-control-padding-x-sm))]',
        xs: "h-[var(--ui-button-height-xs,var(--ui-control-height-xs))] gap-1 px-[var(--ui-button-padding-x-xs)] text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-[var(--ui-button-height-sm,var(--ui-control-height-sm))] gap-1.5 px-[var(--ui-button-padding-x-sm,var(--ui-control-padding-x-sm))] has-[>svg]:px-2.5',
        lg: 'h-[var(--ui-button-height-lg,var(--ui-control-height-lg))] px-[var(--ui-button-padding-x-lg)] has-[>svg]:px-4',
        icon: 'size-[var(--ui-button-height-md,var(--ui-control-height-md))]',
        'icon-xs':
          "size-[var(--ui-button-height-xs,var(--ui-control-height-xs))] [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-[var(--ui-button-height-sm,var(--ui-control-height-sm))]',
        'icon-lg':
          'size-[var(--ui-button-height-lg,var(--ui-control-height-lg))]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
