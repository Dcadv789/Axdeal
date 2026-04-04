import { MessageCircle, Mail, Send, Search, Lightbulb, Phone, BookOpen } from 'lucide-react';
import { useState } from 'react';

interface FAQ {
  id: number;
  question: string;
  isPopular?: boolean;
}

export default function SupportContent() {
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs: FAQ[] = [
    { id: 1, question: 'Como configurar minha chave Pix?', isPopular: true },
    { id: 2, question: 'Como adicionar um novo usuário?', isPopular: true },
    { id: 3, question: 'Como gerar um relatório de vendas?', isPopular: true },
    { id: 4, question: 'Como alterar minha senha?', isPopular: false },
    { id: 5, question: 'Quais são os métodos de pagamento aceitos?', isPopular: false },
  ];

  const articles = [
    { id: 1, title: 'Guia Completo de Configuração', category: 'Setup', reads: 1230 },
    { id: 2, title: 'Como Usar Relatórios', category: 'Análises', reads: 890 },
    { id: 3, title: 'Integração com Sistemas', category: 'Integração', reads: 650 },
    { id: 4, title: 'Segurança e Boas Práticas', category: 'Segurança', reads: 420 },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Feedback enviado:', { type: feedbackType, message: feedbackMessage });
    setFeedbackType('');
    setFeedbackMessage('');
  };

  return (
    <div className="py-8 space-y-8">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-neutral-900 dark:to-neutral-900 border border-gray-200 dark:border-gray-700/50 rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="text-left group hover:translate-y-[-2px] transition-transform">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-600 transition-colors">
                <MessageCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  WhatsApp
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Resposta em até 2 horas
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                  Clique para abrir
                </p>
              </div>
            </div>
          </button>

          <button className="text-left group hover:translate-y-[-2px] transition-transform">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-400 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-500 transition-colors">
                <Mail size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  E-mail
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  suporte@axcharge.axory.com.br
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-2">
                  Envie suas dúvidas
                </p>
              </div>
            </div>
          </button>

          <div className="text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Horário de Atendimento
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Seg - Sex, 9h às 18h
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2">
                  Em horário comercial
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <BookOpen size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Artigos
            </h2>
          </div>
          <div className="space-y-3">
            {articles.map((article) => (
              <button
                key={article.id}
                className="w-full text-left p-4 border border-[#E5E7EB] dark:border-[#262626] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {article.title}
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full font-medium">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {article.reads.toLocaleString()} leituras
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center">
              <Search size={20} className="text-gray-600 dark:text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="relative mb-6">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar pergunta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-600 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq) => (
                <button
                  key={faq.id}
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  className="w-full text-left p-4 border border-[#E5E7EB] dark:border-[#262626] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      {faq.question}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 flex-shrink-0 transition-transform duration-200" style={{
                      transform: expandedFaq === faq.id ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  </div>
                  {expandedFaq === faq.id && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-[#262626]">
                      Resposta detalhada para: {faq.question}
                    </p>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma pergunta encontrada
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-[#E5E7EB] dark:border-[#262626] rounded-xl p-8">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lightbulb size={24} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Compartilhe seu Feedback
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Sua opinião é muito importante para melhorarmos nossos serviços
            </p>
          </div>
        </div>

        <form onSubmit={handleSendFeedback} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Tipo de Feedback
            </label>
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-600 focus:border-transparent outline-none text-sm transition-all"
            >
              <option value="">Selecione o tipo</option>
              <option value="bug">Relatório de Bug</option>
              <option value="feature">Solicitação de Recurso</option>
              <option value="experience">Feedback de Experiência</option>
              <option value="other">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Mensagem
            </label>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Conte-nos mais sobre sua experiência, sugestão ou problema..."
              required
              rows={4}
              className="w-full px-4 py-3 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-600 focus:border-transparent outline-none text-sm resize-none transition-all"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-gray-900 dark:bg-gray-100 hover:bg-black dark:hover:bg-white text-white dark:text-black rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
            >
              <Send size={16} />
              Enviar Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
