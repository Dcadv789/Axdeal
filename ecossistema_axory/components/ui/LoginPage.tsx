import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      const msg = (error as any).message || error.message || String(error);
      const errorMap: Record<string, string> = {
        'Invalid login credentials': 'Email ou senha incorretos.',
        'Invalid API key': 'Chave da API do Supabase inválida. Atualize o arquivo apps/erp/.env.local com a chave correta: Supabase Dashboard → Configurações do Projeto → API → chave "anon" (pública). Depois reinicie o servidor (npm run dev).',
        'Email not confirmed': 'Seu email ainda não foi confirmado. Verifique sua caixa de entrada.',
        'User not found': 'Nenhum usuário encontrado com este email.',
        'Too many requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
        'Network request failed': 'Erro de conexão. Verifique sua internet.',
      };

      const friendlyMsg = Object.entries(errorMap).find(([key]) =>
        msg.toLowerCase().includes(key.toLowerCase())
      )?.[1];

      setError(friendlyMsg || `Erro ao fazer login: ${msg}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bS0yIDJ2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yem0wIDR2Mmgydi0yaC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>

        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-20 w-96 h-96 bg-blue-800 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full px-16 text-white">
          <div className="max-w-lg">
            <div className="mb-8">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4L4 12L20 20L36 12L20 4Z" fill="white" fillOpacity="0.9"/>
                  <path d="M4 20L20 28L36 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                  <path d="M4 28L20 36L36 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fillOpacity="0.9"/>
                </svg>
              </div>
              <h1 className="text-5xl font-bold mb-4 leading-tight">
                Gerencie seu negócio de forma inteligente
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Controle propostas, clientes e finanças em um só lugar. Transforme dados em decisões estratégicas.
              </p>
            </div>

            <div className="space-y-6 mt-12">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6668 5L7.50016 14.1667L3.3335 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Dashboard Intuitivo</h3>
                  <p className="text-blue-100">Visualize métricas importantes em tempo real</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6668 5L7.50016 14.1667L3.3335 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Gestão Completa</h3>
                  <p className="text-blue-100">Propostas, clientes e finanças integrados</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.6668 5L7.50016 14.1667L3.3335 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Segurança Garantida</h3>
                  <p className="text-blue-100">Seus dados protegidos e sempre disponíveis</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[40%] flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo de volta</h2>
            <p className="text-gray-600">Entre com suas credenciais para acessar sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-gray-900 placeholder-gray-400"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff size={20} className="text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye size={20} className="text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-600">Lembrar-me</span>
              </label>
              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Esqueceu a senha?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{' '}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Cadastre-se gratuitamente
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Ao continuar, você concorda com nossos{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">Termos de Serviço</a>
              {' '}e{' '}
              <a href="#" className="text-blue-600 hover:text-blue-700">Política de Privacidade</a>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
