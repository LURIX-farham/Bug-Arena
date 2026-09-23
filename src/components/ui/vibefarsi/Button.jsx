import { forwardRef } from 'react'

const variants = {
  default: 'vf-button-default',
  secondary: 'vf-button-secondary',
  outline: 'vf-button-outline',
  ghost: 'vf-button-ghost',
  brand: 'vf-button-brand',
  destructive: 'vf-button-destructive',
}

const sizes = {
  sm: 'vf-button-sm',
  md: 'vf-button-md',
  lg: 'vf-button-lg',
  icon: 'vf-button-icon',
}

const Button = forwardRef(function Button(
  {
    children,
    className = '',
    variant = 'default',
    size = 'md',
    type = 'button',
    ...props
  },
  ref,
) {
  const classes = [
    'vf-button',
    variants[variant] || variants.default,
    sizes[size] || sizes.md,
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
export { Button }
