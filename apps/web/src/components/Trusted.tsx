/**
 * Renders a string from our own translation tables (packages/core/src/i18n.ts) that contains <b> tags.
 * Only for those static strings: anything from an API or a user (place names, notes) is rendered as
 * plain React text, never through this component.
 */
export function Trusted({ as: Tag, html, className, hidden }: { as: 'p' | 'div'; html: string; className?: string; hidden?: boolean }) {
  return <Tag className={className} hidden={hidden} dangerouslySetInnerHTML={{ __html: html }} />;
}
