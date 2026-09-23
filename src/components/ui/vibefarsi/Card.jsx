/**
 * VibeFarsi-style Card with optional header / title / description.
 */
function Card({
  title,
  description,
  children,
  footer,
  className = '',
  ...props
}) {
  return (
    <div className={['vf-card', className].filter(Boolean).join(' ')} {...props}>
      {(title || description) && (
        <div className="vf-card-header">
          {title && <h3 className="vf-card-title">{title}</h3>}
          {description && <p className="vf-card-desc">{description}</p>}
        </div>
      )}
      {children && <div className="vf-card-body">{children}</div>}
      {footer && <div className="vf-card-footer">{footer}</div>}
    </div>
  )
}

export default Card
export { Card }
