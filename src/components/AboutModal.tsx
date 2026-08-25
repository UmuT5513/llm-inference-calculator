import React from 'react';
import { X, Info, Calculator, Database, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Panel } from './ui/Panel';
import { SectionHeader } from './ui/SectionHeader';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface border border-border rounded-md shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-accent shrink-0" />
            <h2 className="text-[11px] font-bold font-mono uppercase tracking-wider text-text">
              Metodoloji & Hakkında
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-2 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted leading-relaxed">
            Bu araç, açık kaynak LLM'leri kendi donanımınızda veya bulutta çalıştırmanın VRAM,
            gecikme ve maliyet gereksinimlerini <span className="text-text font-semibold">giriş yapmadan,
            tamamen tarayıcınızda</span> hesaplamanız için geliştirilmiş topluluğa açık bir projedir.
          </p>

          <Panel className="overflow-hidden">
            <SectionHeader
              title="Çıkarım (Inference) Hesaplama Yöntemi"
              right={<Calculator className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>
                <span className="text-text font-medium">Model belleği:</span> parametre sayısı ×
                kuantizasyon başına bayt (örn. 70B FP8 ≈ 70 GB).
              </li>
              <li>
                <span className="text-text font-medium">KV cache:</span> 2 × KV head sayısı × head
                boyutu × katman sayısı × bağlam uzunluğu × eşzamanlı kullanıcı; parçalanma
                (fragmentation) payı eklenir.
              </li>
              <li>
                <span className="text-text font-medium">Toplam VRAM:</span> model + KV cache +
                aktivasyon + CUDA/çalışma zamanı yükü; TP/PP verimlilik katsayıları uygulanır.
              </li>
              <li>
                <span className="text-text font-medium">TTFT (ilk token):</span> prefill FLOP ihtiyacı
                ÷ GPU'ların efektif FLOP kapasitesi (compute-bound yaklaşımı).
              </li>
              <li>
                <span className="text-text font-medium">TPOT (token başına süre):</span> (aktif ağırlık
                + KV cache baytları) ÷ bellek bant genişliği (bandwidth-bound yaklaşımı).
              </li>
              <li>
                <span className="text-text font-medium">Maliyet:</span> saatlik GPU fiyatı × kart sayısı;
                bulut karşılaştırması RunPod / Lambda / Modal fiyatlarıyla, on-prem TCO ise elektrik,
                PUE ve amortisman varsayımlarıyla hesaplanır.
              </li>
            </ul>
          </Panel>

          <Panel className="overflow-hidden">
            <SectionHeader
              title="Fine-Tuning Hesaplama Yöntemi"
              right={<Calculator className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>
                Dataset token sayısı × epoch üzerinden toplam eğitim token'ı; yöntem (QLoRA / LoRA /
                tam) bazında VRAM ihtiyacı tahmin edilir.
              </li>
              <li>
                Eğitim süresi, seçilen GPU'nun throughput'u ve framework (Unsloth vb.) hız çarpanı
                ile hesaplanır; Colab / RunPod gibi platformların maliyet karşılaştırması sunulur.
              </li>
            </ul>
          </Panel>

          <Panel className="overflow-hidden">
            <SectionHeader
              title="Veri Kaynakları"
              right={<Database className="w-4 h-4 text-accent shrink-0" />}
            />
            <ul className="p-3.5 space-y-2 text-xs text-muted list-disc list-inside marker:text-accent">
              <li>
                Model mimarileri (parametre, katman, head, bağlam uzunluğu): Hugging Face Hub
                kataloğu + elle derlenmiş (curated) açık kaynak model listesi.
              </li>
              <li>
                GPU özellikleri: üretici/sağlayıcı spesifikasyonlarına dayanan yerleşik ön ayarlar.
              </li>
              <li>
                Saatlik bulut fiyatları: RunPod, Lambda ve Modal'dan periyodik olarak toplanır;
                sonuç panelindeki "son güncelleme" zamanına bakabilirsiniz.
              </li>
            </ul>
          </Panel>

          <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-md p-3.5">
            <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <span className="text-text font-semibold">Önemli:</span> Tüm sonuçlar analitik
              tahmindir; gerçek performans motor yapılandırmasına, modele, donanıma ve iş yüküne göre
              değişir. Üretim kararı vermeden önce kendi iş yükünüzle ölçüm yapmanızı öneririz.
            </p>
          </div>

          <div className="flex items-start gap-2.5 bg-surface-2 border border-border rounded-md p-3.5">
            <ShieldCheck className="w-4 h-4 text-ok shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              <span className="text-text font-semibold">Gizlilik (KVKK):</span> Bu uygulama giriş,
              üyelik veya çerez gerektirmez; hiçbir kişisel veri toplanmaz ve sunucuya gönderilmez.
              Kaydettiğiniz senaryolar yalnızca tarayıcınızın yerel depolamasında (localStorage) tutulur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
