import { createContext, useContext, useState } from 'react'

const TabsContext = createContext(null)

/**
 * VibeFarsi-style Tabs — RTL-aware segmented or underline variants.
 */
function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  variant = 'underline',
  children,
  className = '',
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlledValue !== undefined ? controlledValue : uncontrolled
  const setValue = (v) => {
    if (controlledValue === undefined) setUncontrolled(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ value, setValue, variant }}>
      <div className={['vf-tabs', `vf-tabs-${variant}`, className].filter(Boolean).join(' ')}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ children, className = '' }) {
  return (
    <div className={['vf-tabs-list', className].filter(Boolean).join(' ')} role="tablist">
      {children}
    </div>
  )
}

function TabsTrigger({ value, children, className = '', disabled = false }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used inside Tabs')
  const active = ctx.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      className={[
        'vf-tabs-trigger',
        active ? 'vf-tabs-trigger-active' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={() => ctx.setValue(value)}
    >
      {children}
    </button>
  )
}

function TabsContent({ value, children, className = '' }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used inside Tabs')
  if (ctx.value !== value) return null

  return (
    <div className={['vf-tabs-content', className].filter(Boolean).join(' ')} role="tabpanel">
      {children}
    </div>
  )
}

export default Tabs
export { Tabs, TabsList, TabsTrigger, TabsContent }
