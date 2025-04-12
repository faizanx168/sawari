declare module '@/app/components/ui/button' {
  import { ButtonHTMLAttributes } from 'react';
  import { VariantProps } from 'class-variance-authority';

  export interface ButtonVariants {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }

  export const buttonVariants: (options: ButtonVariants) => string;

  export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
      VariantProps<typeof buttonVariants> {
    asChild?: boolean;
  }

  const Button: React.ForwardRefExoticComponent<
    ButtonProps & React.RefAttributes<HTMLButtonElement>
  >;

  export { Button };
} 