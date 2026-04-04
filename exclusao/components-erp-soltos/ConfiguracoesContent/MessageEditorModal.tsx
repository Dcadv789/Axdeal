import { X } from 'lucide-react';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface MessageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  message: string;
  onSave: (subject: string, message: string) => void;
}

const SYSTEM_VARIABLES = [
  { label: 'Nome do Cliente', value: '{{cliente_nome}}' },
  { label: 'E-mail do Cliente', value: '{{cliente_email}}' },
  { label: 'Telefone do Cliente', value: '{{cliente_telefone}}' },
  { label: 'Valor', value: '{{valor}}' },
  { label: 'Data de Vencimento', value: '{{data_vencimento}}' },
  { label: 'Dias em Atraso', value: '{{dias_atraso}}' },
  { label: 'Nome da Empresa', value: '{{empresa_nome}}' },
  { label: 'Telefone da Empresa', value: '{{empresa_telefone}}' },
  { label: 'E-mail da Empresa', value: '{{empresa_email}}' },
];

export default function MessageEditorModal({ isOpen, onClose, subject, message, onSave }: MessageEditorModalProps) {
  const [localSubject, setLocalSubject] = useState(subject);
  const [localMessage, setLocalMessage] = useState(message);
  const [activeField, setActiveField] = useState<'subject' | 'message'>('message');

  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertVariable = (variable: string) => {
    if (activeField === 'subject') {
      const input = subjectRef.current;
      if (input) {
        const start = input.selectionStart || localSubject.length;
        const end = input.selectionEnd || localSubject.length;
        const newValue = localSubject.substring(0, start) + variable + localSubject.substring(end);
        setLocalSubject(newValue);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    } else {
      const textarea = messageRef.current;
      if (textarea) {
        const start = textarea.selectionStart || localMessage.length;
        const end = textarea.selectionEnd || localMessage.length;
        const newValue = localMessage.substring(0, start) + variable + localMessage.substring(end);
        setLocalMessage(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length, start + variable.length);
        }, 0);
      }
    }
  };

  const handleSave = () => {
    onSave(localSubject, localMessage);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#171717] rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-[#262626]">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Editar Mensagem
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure o assunto e a mensagem que será enviada
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Variáveis do Sistema
              </h3>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_VARIABLES.map((variable) => (
                  <button
                    key={variable.value}
                    onClick={() => handleInsertVariable(variable.value)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-[#262626] hover:bg-gray-200 dark:hover:bg-[#2c2c2c] text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-200 dark:border-[#404040] transition-colors cursor-pointer"
                  >
                    {variable.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Clique em uma variável para inseri-la no campo ativo (assunto ou mensagem)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Assunto
                </label>
                <input
                  ref={subjectRef}
                  type="text"
                  value={localSubject}
                  onChange={(e) => setLocalSubject(e.target.value)}
                  onFocus={() => setActiveField('subject')}
                  placeholder="Ex: Lembrete de Vencimento - {{cliente_nome}}"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-[#262626] rounded-lg bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Mensagem
                </label>
                <textarea
                  ref={messageRef}
                  value={localMessage}
                  onChange={(e) => setLocalMessage(e.target.value)}
                  onFocus={() => setActiveField('message')}
                  placeholder="Ex: Olá {{cliente_nome}}, informamos que o pagamento no valor de {{valor}} vence em {{data_vencimento}}..."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-[#262626] rounded-lg bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-[#262626]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] rounded-lg font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Salvar Mensagem
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
