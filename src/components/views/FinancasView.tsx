import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FinancialTransaction, Congregation } from '../../types';

interface FinancasViewProps {
  finances: FinancialTransaction[];
  congregations: Congregation[];
  onAddTransaction: () => void;
}

export const FinancasView: React.FC<FinancasViewProps> = ({
  finances,
  congregations,
  onAddTransaction,
}) => {
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos');

  const receitas = finances.filter((f) => f.type === 'receita');
  const despesas = finances.filter((f) => f.type === 'despesa');

  const totalReceitas = receitas.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDespesas = despesas.reduce((acc, curr) => acc + curr.amount, 0);
  const saldoAtual = totalReceitas - totalDespesas;

  const filteredFinances = finances.filter((f) => {
    if (filterType === 'todos') return true;
    return f.type === filterType;
  });

  const chartData = [
    { category: 'Dízimos', valor: 14500 },
    { category: 'Ofertas', valor: 3200 },
    { category: 'Missões', valor: 2100 },
    { category: 'Aluguel', valor: 5800 },
    { category: 'Manutenção', valor: 1250 },
    { category: 'Ação Social', valor: 1800 },
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Gestão Financeira & Dízimos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Transparência e fidelidade na administração dos recursos da igreja.
          </p>
        </div>

        <button
          onClick={onAddTransaction}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-200 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Lançar Dízimo / Entrada / Saída
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Entradas
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600">
              R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Dízimos, ofertas e doações</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total de Saídas
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600">
              R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Manutenção, contas e investimentos</p>
        </div>

        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Saldo Líquido
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400">
              R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Disponível em caixa e banco</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <h2 className="font-bold text-slate-900 text-base mb-1">
          Distribuição de Entradas e Despesas por Categoria
        </h2>
        <p className="text-xs text-slate-500 mb-6">Valores consolidados em Reais (R$)</p>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="valor" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="font-bold text-slate-900 text-base">Extrato Financeiro Recente</h2>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
            {(['todos', 'receita', 'despesa'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                  filterType === t
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Tipo / Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Forma de Pgto</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFinances.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.type === 'receita'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.description}</td>
                  <td className="px-4 py-3 text-slate-500">{item.date}</td>
                  <td className="px-4 py-3 text-slate-500">{item.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-bold">
                    <span className={item.type === 'receita' ? 'text-emerald-600' : 'text-rose-600'}>
                      {item.type === 'receita' ? '+' : '-'} R${' '}
                      {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
