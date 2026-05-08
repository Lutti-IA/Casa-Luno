/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'REVENUE' | 'EXPENSE' | 'VARIANCE';

export type RevenueCategory = 
  | 'Prognóstico'
  | 'Ibama'
  | 'Cotas MKP'
  | 'Resgate telesena'
  | 'Tarifação'
  | 'Federal'
  | 'Instantâneas'
  | 'Fiserv + Jad Log'
  | 'Compra de Chip'
  | 'Bolão'
  | 'Lucro Imprime Aqui'
  | 'Produtos'
  | 'Servlot Loterica'
  | 'Servlot';

export type ExpenseCategory = 
  | 'Banco'
  | 'Imovel'
  | 'Funcionarios'
  | 'Contabilidade'
  | 'Segurança'
  | 'Loterica';

export type VarianceCategory = 'Quebra de Caixa';

export interface Transaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  category: RevenueCategory | ExpenseCategory | VarianceCategory;
  description?: string;
  amount: number;
  date: string;
}

export const REVENUE_CATEGORIES: RevenueCategory[] = [
  'Prognóstico',
  'Ibama',
  'Cotas MKP',
  'Resgate telesena',
  'Tarifação',
  'Federal',
  'Instantâneas',
  'Fiserv + Jad Log',
  'Compra de Chip',
  'Bolão',
  'Lucro Imprime Aqui',
  'Produtos',
  'Servlot Loterica',
  'Servlot'
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Banco',
  'Imovel',
  'Funcionarios',
  'Contabilidade',
  'Segurança',
  'Loterica'
];

export const VARIANCE_CATEGORIES: VarianceCategory[] = [
  'Quebra de Caixa'
];
