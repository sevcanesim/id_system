# Package Script Semantik Envanteri

## 3 Eylül 2026 sonucu

`package.json` içinde 133 script incelendi. Yapısal denetim sonucu:

| Kontrol | Sonuç |
| --- | --- |
| `node scripts/*.mjs` hedefi olmayan script | 0 |
| `npm run <ad>` ile çağrılıp tanımlanmamış script | 0 |
| GitHub Actions workflow'larında tanımsız `npm run <ad>` çağrısı | 0 |

Bu sonuç yalnız referans bütünlüğünü kanıtlar; bir scriptin ürün için hâlâ
gerekli olduğunu tek başına kanıtlamaz. Bu nedenle kanıtsız toplu script silme
yapılmamıştır.

## Mevcut anlamlar

| Grup | Örnekler | Karar |
| --- | --- | --- |
| Geliştirme | `dev`, `build`, `start`, `typecheck`, `lint` | Aktif. `lint` şu anda ESLint değil, TypeScript typecheck alias'ıdır; adı korunurken bu anlam dokümante edilmelidir. |
| Güncel release | `verify:release`, `verify:secrets`, `verify:corporate-leads`, `verify:demo-qa-matrix` | Aktif. `verify:release` 3 Eylül'de başarılı çalıştı. |
| Test | `test:unit`, `test:e2e`, `test:critical`, `test` | Aktif. Unit ve browser katmanları ayrı kalır; browser ortam sorunu unit başarısı gibi raporlanmaz. |
| Ortam/veritabanı | `verify:db`, `verify:migration-drift`, `db:push`, `verify:production-env` | Ortama bağlı. `db:push` mutasyon yapar; yalnız hedef ortam açıkça seçildiğinde çalıştırılır. |
| Faz sözleşmeleri | `verify:phase*`, `verify:faz*`, `verify:roadmap:*` | Tarihsel ama referanslı kalite sözleşmeleri. Sahiplik ve çağrı grafiği incelenmeden silinmez. |
| Paket/release artifact | `release:package`, `verify:release-artifact`, `verify:pre-share` | Aktif release iş akışı. |

## Güvenli azaltma kuralı

Bir script ancak aşağıdakilerin tamamı sağlanırsa kaldırılabilir:

1. `package.json`, workflow, doküman, npm wrapper ve release otomasyonunda çağrısı
   yoktur.
2. Çağırdığı doğrulama başka, güncel ve daha dar bir gate tarafından kapsanır.
3. CI'da en az bir tur yeni çağrı grafiğiyle başarıyla çalışmıştır.
4. Scriptin kapsadığı güvenlik, migration veya release şartı için ürün sahibi
   kaldırma kararını onaylamıştır.

İlk adaylar, `verify:phase*` ve `verify:faz*` zincirleri içindeki tekrar eden
kontrollerdir; fakat bu envanter onların silinebileceği sonucuna varmaz. Sonraki
adım, CI workflow'larının hangi entrypoint'i çağırdığını ve her scriptin benzersiz
assertion setini çıkararak çağrı grafiğini oluşturmaktır.
