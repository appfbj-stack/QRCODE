import React, { useEffect, useState } from "react";
import { Shield, Mail, Building2, Eye, Trash2, Download, Lock, FileText, CheckCircle2 } from "lucide-react";

interface Politica {
  versao: string;
  vigencia: string;
  empresa: string;
  controladora: string;
  operadora: string;
  contato: { email: string; responsavel: string };
  dpo: { nome: string; email: string };
  baseLegal: string;
  finalidades: string[];
  dadosColetados: Array<{ campo: string; obrigatorio: boolean; finalidade: string }>;
  compartilhamento: string;
  retencao: string;
  seguranca: string;
  direitos: string[];
  retencao_categorias: Record<string, string>;
  suboperadores: Array<{ nome: string; servico: string; url: string }>;
}

export const PrivacyView: React.FC = () => {
  const [politica, setPolitica] = useState<Politica | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/privacidade")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setPolitica(j.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-[#5a5a40]">Carregando política...</div>
      </div>
    );
  }

  if (!politica) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-rose-600">Erro ao carregar política de privacidade.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#2a2a20]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2a2a20] to-[#5a5a40] text-white px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-8 h-8 text-amber-300" />
            <h1 className="text-3xl font-bold font-serif">Política de Privacidade</h1>
          </div>
          <p className="text-amber-100/80 text-sm">
            Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1 bg-white/10 rounded-full">
              Versão: {politica.versao}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full">
              Vigência: {politica.vigencia}
            </span>
            <a
              href="/"
              className="px-3 py-1 bg-amber-300/20 hover:bg-amber-300/30 rounded-full text-amber-200"
            >
              ← Voltar ao app
            </a>
          </div>
        </div>
      </div>

      {/* Conteudo */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Quem somos */}
        <Section icon={<Building2 className="w-5 h-5" />} title="Quem somos">
          <p className="text-sm leading-relaxed">
            <strong>{politica.empresa}</strong>
            <br />
            <strong>Controladora:</strong> {politica.controladora}
            <br />
            <strong>Operadora da plataforma:</strong> {politica.operadora}
          </p>
        </Section>

        {/* Base legal */}
        <Section icon={<Lock className="w-5 h-5" />} title="Base legal para tratamento">
          <p className="text-sm leading-relaxed">{politica.baseLegal}</p>
          <p className="text-xs text-[#5a5a40] mt-2 italic">
            Atenção: dados religiosos são <strong>dados sensíveis</strong> segundo o Art. 5°, II da LGPD.
            O tratamento é feito mediante consentimento específico e destacado.
          </p>
        </Section>

        {/* Finalidades */}
        <Section icon={<FileText className="w-5 h-5" />} title="Para que usamos seus dados">
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            {politica.finalidades.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </Section>

        {/* Dados coletados */}
        <Section icon={<Eye className="w-5 h-5" />} title="Quais dados coletamos">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#d0d0c0]">
                  <th className="text-left py-2 px-2 font-bold">Campo</th>
                  <th className="text-left py-2 px-2 font-bold">Obrigatório</th>
                  <th className="text-left py-2 px-2 font-bold">Finalidade</th>
                </tr>
              </thead>
              <tbody>
                {politica.dadosColetados.map((d, i) => (
                  <tr key={i} className="border-b border-[#e0e0d0]/50">
                    <td className="py-2 px-2 font-semibold">{d.campo}</td>
                    <td className="py-2 px-2">
                      {d.obrigatorio ? (
                        <span className="text-rose-600">Obrigatório</span>
                      ) : (
                        <span className="text-[#8a8a70]">Opcional</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-[#5a5a40]">{d.finalidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Compartilhamento */}
        <Section icon={<Shield className="w-5 h-5" />} title="Com quem compartilhamos">
          <p className="text-sm leading-relaxed mb-3">{politica.compartilhamento}</p>
          <p className="text-xs font-bold mb-2">Suboperadores:</p>
          <ul className="text-sm space-y-1.5">
            {politica.suboperadores.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5a5a40]" />
                <span className="font-semibold">{s.nome}</span>
                <span className="text-[#8a8a70]">— {s.servico}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5a5a40] hover:underline text-xs"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        </Section>

        {/* Retencao */}
        <Section icon={<FileText className="w-5 h-5" />} title="Por quanto tempo guardamos seus dados">
          <p className="text-sm leading-relaxed mb-3">{politica.retencao}</p>
          <ul className="text-sm space-y-1">
            {Object.entries(politica.retencao_categorias).map(([cat, tempo], i) => (
              <li key={i}>
                <strong>{cat}:</strong> {tempo}
              </li>
            ))}
          </ul>
        </Section>

        {/* Seguranca */}
        <Section icon={<Lock className="w-5 h-5" />} title="Como protegemos seus dados">
          <p className="text-sm leading-relaxed">{politica.seguranca}</p>
        </Section>

        {/* Direitos */}
        <Section icon={<CheckCircle2 className="w-5 h-5" />} title="Seus direitos (Art. 18 LGPD)">
          <p className="text-sm mb-3">Você tem direito a:</p>
          <ul className="text-sm space-y-1.5 list-disc list-inside">
            {politica.direitos.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
            <strong>Como exercer seus direitos:</strong> faça login no app, vá em{" "}
            <strong>Meu Perfil → Privacidade</strong> para baixar seus dados, solicitar exclusão
            ou revogar consentimento. Ou envie um e-mail para{" "}
            <a
              href={`mailto:${politica.contato.email}`}
              className="text-[#5a5a40] font-semibold hover:underline"
            >
              {politica.contato.email}
            </a>
            .
          </div>
        </Section>

        {/* Contato / DPO */}
        <Section icon={<Mail className="w-5 h-5" />} title="Contato do encarregado (DPO)">
          <p className="text-sm">
            <strong>Encarregado de Dados (DPO):</strong> {politica.dpo.nome}
            <br />
            <strong>E-mail:</strong>{" "}
            <a
              href={`mailto:${politica.dpo.email}`}
              className="text-[#5a5a40] font-semibold hover:underline"
            >
              {politica.dpo.email}
            </a>
            <br />
            <strong>Contato da controladora:</strong>{" "}
            <a
              href={`mailto:${politica.contato.email}`}
              className="text-[#5a5a40] font-semibold hover:underline"
            >
              {politica.contato.email}
            </a>
          </p>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-[#8a8a70] py-6 border-t border-[#d0d0c0]">
          <p>Esta política é pública e pode ser consultada a qualquer momento.</p>
          <p className="mt-1">Última atualização: {politica.vigencia}</p>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <section className="bg-white rounded-2xl shadow-sm border border-[#e0e0d0] p-5">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#e0e0d0]">
      <div className="w-8 h-8 rounded-xl bg-[#5a5a40]/10 text-[#5a5a40] flex items-center justify-center">
        {icon}
      </div>
      <h2 className="font-bold text-[#2a2a20] text-base">{title}</h2>
    </div>
    <div className="text-[#2a2a20]">{children}</div>
  </section>
);

export default PrivacyView;
