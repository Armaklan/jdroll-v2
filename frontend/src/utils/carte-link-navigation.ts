// Clic sur un lien [carte] généré par le BBCode dans le contenu d'un
// message (sujet de forum, messagerie privée). Au clic simple, on
// navigue en SPA pour que le viewer de carte sache qu'il existe une
// page précédente dans l'onglet (bouton Retour) ; les clics avec
// modificateurs (ctrl/cmd/shift/alt) et le clic milieu retombent sur
// le comportement natif du <a> (nouvel onglet, etc.).

export interface CarteLinkClickEvent {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
  preventDefault(): void;
}

/**
 * Intercepte le clic sur un lien [carte] : navigation SPA au clic
 * simple, comportement natif (nouvel onglet) sinon.
 */
export function handleCarteLinkClick(
  e: CarteLinkClickEvent,
  href: string | null,
  navigate: (to: string) => void
): void {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (e.button !== 0) return;
  if (!href) return;
  e.preventDefault();
  navigate(href);
}
