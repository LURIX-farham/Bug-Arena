function Button({ children, variant = 'primary' }) {
  return (
    <button className={`button button-${variant}`}>
      {children}
    </button>
  )
}

export default Button