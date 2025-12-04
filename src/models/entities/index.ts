// ============================================
// MODEL - ENTITIES (Entidades del dominio)
// ============================================
// Define las estructuras de datos del sistema bancario

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export type AccountType = 'ahorro' | 'corriente' | 'empresarial';

export interface BankAccount {
  id: string;
  userId: string;
  type: AccountType;
  accountNumber: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  interestRate: number;
  creditId?: string;
}

export type CreditType = 'personal' | 'hipotecario' | 'empresarial';

export interface Credit {
  id: string;
  userId: string;
  type: CreditType;
  amount: number;
  interestRate: number;
  term: number;
  monthlyPayment: number;
  remainingPayments: number;
  paidAmount: number;
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'completed';
  requestedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  toAccountId?: string;
}

export type ServiceType = 'insurance' | 'cashback' | 'advisory';

export interface AdditionalService {
  id: string;
  name: string;
  type: ServiceType;
  price: number;
  description: string;
}

export interface Payment {
  id: string;
  creditId: string;
  userId: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentNumber: number;
}

export type ScoreLevel = 'good' | 'medium' | 'bad';

export const SCORE_THRESHOLDS = {
  GOOD: 700,
  MEDIUM: 400,
} as const;

export interface CreditScore {
  id: string;
  userId: string;
  score: number;
  level: ScoreLevel;
  onTimePayments: number;
  latePayments: number;
  activeDebts: number;
  pastDebtProblems: boolean;
  creditRequestsLast6Months: number;
  lastUpdated: string;
}
