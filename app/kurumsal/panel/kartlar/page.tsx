/**
 * Dedicated card inventory route.
 *
 * The persistent CorporatePanelClient shell resolves `/kurumsal/panel/kartlar`
 * to the `cards` tab and renders CardsPanel. This page intentionally renders
 * no additional route content; redirecting from here would make the card
 * inventory flash briefly before navigation moves to the employees route.
 */
export default function Page() {
  return null;
}
