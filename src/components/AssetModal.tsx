import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Tag,
  DollarSign,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Asset, Congregation } from '../types';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => void;
  initialData?: Asset | null;
  congregations: Congregation[];
  defaultCongregationId?: string;
}

const CATEGORIES: Array<Asset['category']> = [
  'Equipamento de Som',
  'Instrumento Musical',
  'Mobiliário',
  'Mídia/TI',
  'Imóvel/Estrutura',
  'Outros',
];

const CONDITIONS: Array<Asset['condition']> = [
  'Excelente',
  'Bom',
  'Necessita Reparo',
  'Danificado',
];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  congregations,
  defaultCongregationId,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Asset['category']>('Equipamento de Som');
  const [quantity, setQuantity] = useState<number>(1);
  const [estimatedValue, setEstimatedValue] = useState<string>('');
  const [condition, setCondition] = useState<Asset['condition']>('Excelente');
  const [congregationId, setCongregationId] = useState<string>('');
  const [locationDetails, setLocationDetails] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setCategory(initialData.category || 'Equipamento de Som');
      setQuantity(initialData.quantity || 1);
      setEstimatedValue(initialData.estimatedValue ? String(initialData.estimatedValue) : '');
      setCondition(initialData.condition || 'Excelente');
      setCongregationId(initialData.congregationId || defaultCongregationId || congregations[0]?.id || '');
      setLocationDetails(initialData.locationDetails || '');
      setAcquisitionDate(initialData.acquisitionDate || '');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setCategory('Equipamento de Som');
      setQuantity(1);
      setEstimatedValue('');
      setCondition('Excelente');
      setCongregationId(defaultCongregationId || congregations[0]?.id || '');
      setLocationDetails('');
      setAcquisitionDate('');
      setNotes('');
    }
  }, [initialData, isOpen, congregations, defaultCongregationId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name,
      category,
      quantity: Number(quantity) || 1,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      condition,
      congregationId: congregationId || congregations[0]?.id || 'cong-1',
      locationDetails,
      acquisitionDate,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900">
                {initialData ? 'Editar Item do Patrimônio' : 'Cadastrar Item no Patrimônio'}
              </h2>
              <p className="text-xs text-slate-500">
                {initialData ? 'Atualize as informações do bem' : 'Registre bens, equipamentos e móveis da congregação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Item Name */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-amber-500" />
              Nome do Equipamento / Bem *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Mesa de Som Behringer X32, Projetor Epson, Cadeira Estofada..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900 text-sm"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Estado / Condição
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Estimated Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 2500.00"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              />
            </div>
          </div>

          {/* Congregation & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Congregação / Igreja *
              </label>
              <select
                value={congregationId}
                onChange={(e) => setCongregationId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none font-semibold text-slate-900"
              >
                {congregations.map((cong) => (
                  <option key={cong.id} value={cong.id}>
                    {cong.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                Localização Específica na Igreja
              </label>
              <input
                type="text"
                placeholder="Ex: Palco Principal, Cabine de Som, Sala Kids..."
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Acquisition Date */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Data de Aquisição
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Observações / Detalhes Adicionais
            </label>
            <textarea
              rows={2}
              placeholder="Número de série, fornecedor, garantias ou nota fiscal..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-200 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{initialData ? 'Salvar Alterações' : 'Salvar no Patrimônio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
