'use client';

import { Building2, Users, BarChart3 } from 'lucide-react';
import { useCompany } from '@/lib/context/company-context';

export default function AdminPage() {
  const { companies, companyId, setActiveCompany } = useCompany();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Painel Super Admin
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Gerencie todas as empresas da plataforma.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-[#E5E7EB] dark:border-[#262626] p-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 size={20} className="text-blue-600" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Empresas</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{companies.length}</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-[#E5E7EB] dark:border-[#262626] p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users size={20} className="text-green-600" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Usuários</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">—</p>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-[#E5E7EB] dark:border-[#262626] p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 size={20} className="text-purple-600" />
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Módulos Ativos</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">—</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-[#E5E7EB] dark:border-[#262626]">
          <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#262626]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Empresas</h2>
          </div>
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#262626]">
            {companies.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {c.nome_razao_social}
                </span>
                <button
                  onClick={() => setActiveCompany(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    c.id === companyId
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {c.id === companyId ? 'Ativa' : 'Impersonar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
