/**
 * VibeFarsi-style Empty State — for lists/tables with no data.
 */
function EmptyState({
  title,
  description,
  action,
  icon,
  className = '',
}) {
  return (
    <div className={['vf-empty', className].filter(Boolean).join(' ')}>
      {icon && <div className="vf-empty-icon" aria-hidden="true">{icon}</div>}
      {title && <h3 className="vf-empty-title">{title}</h3>}
      {description && <p className="vf-empty-desc">{description}</p>}
      {action && <div className="vf-empty-action">{action}</div>}
    </div>
  )
}

export default EmptyState
export { EmptyState }
