import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

type ButtonBaseProps = {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    as?: 'button';
    href?: never;
  };

type ButtonAsLink = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: 'a';
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles = {
  primary: 'bg-rhino-red hover:bg-rhino-red-dark text-white',
  secondary: 'bg-rhino-light-gray hover:bg-rhino-gray text-rhino-white',
  outline: 'border-2 border-rhino-red text-rhino-red hover:bg-rhino-red hover:!text-white',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', children, className = '', ...rest } = props;

  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 cursor-pointer';
  const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (props.as === 'a') {
    const { as: _, variant: _v, size: _s, ...anchorProps } = props;
    return (
      <a className={classes} {...(anchorProps as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  const { as: _, variant: _v, size: _s, ...buttonProps } = props;
  return (
    <button className={classes} {...(buttonProps as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
