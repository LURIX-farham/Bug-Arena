/**
 * VibeFarsi-style Skeleton placeholder.
 */
function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  ...props
}) {
  const classes = [
    'vf-skeleton',
    rounded === 'full' ? 'vf-skeleton-full' : '',
    rounded === 'sm' ? 'vf-skeleton-sm' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classes}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  )
}

export default Skeleton
export { Skeleton }
