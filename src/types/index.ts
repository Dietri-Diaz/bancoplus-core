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
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  interestRate: number;
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
  status: 'pending' | 'approved' | 'active' | 'rejected' | 'completed';
  requestedAt: string;
  approvedAt?: string;
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
