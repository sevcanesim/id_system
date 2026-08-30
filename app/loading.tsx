import { PageLoadingView } from "./components/ui/States";

export default function Loading() {
  return (
    <PageLoadingView
      label="Yenomi ID hazırlanıyor"
      hint="İçerik ve görünüm yükleniyor."
    />
  );
}
