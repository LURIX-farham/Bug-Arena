/**
 * VibeFarsi-adapted UI primitives for Bug Arena
 * ─────────────────────────────────────────────
 * Persian-first design rules (RTL layout, Vazirmatn typography,
 * Persian digits) apply ONLY when document language is `fa`.
 * English mode stays LTR + Inter with Latin digits.
 *
 * No Tailwind required — all styles use Bug Arena design tokens.
 */
export { Button } from './Button'
export { Dialog } from './Dialog'
export { ToastProvider } from './Toast'
export { useToast } from './useToast'
export { Input, Field } from './Input'
export { Textarea } from './Textarea'
export { Alert } from './Alert'
export { Badge } from './Badge'
export { Progress } from './Progress'
export { EmptyState } from './EmptyState'
export { Skeleton } from './Skeleton'
export { Switch } from './Switch'
export { Card } from './Card'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs'
