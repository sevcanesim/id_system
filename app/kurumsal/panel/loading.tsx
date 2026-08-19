/**
 * The corporate shell owns its loading state. Keeping this route fallback empty
 * prevents Next's segment loader from mounting a second sidebar/header while
 * the persistent /kurumsal/panel layout remains mounted.
 */
export default function Loading() {
  return null;
}
