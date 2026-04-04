import { X, Send } from 'lucide-react';
import { useState, useEffect } from 'react';

interface EmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clienteEmail: string;
  clienteNome: string;
  clienteId: string;
  onEmailSent: (para: string, assunto: string, mensagem: string) => Promise<void>;
}

export default function EmailDrawer({
  isOpen,
  onClose,
  clienteEmail,
  clienteNome,
  clienteId,
  onEmailSent
}: EmailDrawerProps) {
  const [para, setPara] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPara(clienteEmail || '');
      setAssunto('');
      setMensagem('');
    }
  }, [isOpen, clienteEmail]);

  const handleEnviar = async () => {
    if (!para || !assunto || !mensagem) {
      alert('Por favor, preencha todos os campos');
      return;
    }

    setEnviando(true);
    try {
      await onEmailSent(para, assunto, mensagem);
      onClose();
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      alert('Erro ao agendar envio do e-mail');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Enviar E-mail
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Para: {clienteNome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Para <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Assunto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Digite o assunto do e-mail"
              className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Mensagem <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              rows={12}
              className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-[#262626] rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all resize-y min-h-[200px]"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleEnviar}
            disabled={enviando || !para || !assunto || !mensagem}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            {enviando ? 'Enviando...' : 'Enviar E-mail'}
          </button>
        </div>
      </div>
    </>
  );
}
