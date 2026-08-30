import { LoadingState } from "../../components/ui/States";

export default function Loading() {
  return (
    <div className="corporate-route-loading">
      <LoadingState
        variant="panel"
        label="Panel görünümü hazırlanıyor"
        hint="Güncel kurumsal bilgiler yükleniyor."
      />
    </div>
  );
}
