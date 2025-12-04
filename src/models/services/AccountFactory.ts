// ============================================
// MODEL - SERVICE: Factory Method Pattern
// ============================================
// Patrón Factory Method: Crear diferentes tipos de cuentas bancarias
// Cada factory crea un tipo específico de cuenta con sus características

import { BankAccount, AccountType } from '@/models/entities';

export abstract class BankAccountFactory {
  abstract createAccount(userId: string, accountNumber: string, initialBalance: number): BankAccount;
  
  protected generateId(): string {
    return `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class SavingsAccountFactory extends BankAccountFactory {
  createAccount(userId: string, accountNumber: string, initialBalance: number): BankAccount {
    return {
      id: this.generateId(),
      userId,
      type: 'ahorro',
      accountNumber,
      balance: initialBalance,
      currency: 'PEN',
      status: 'active',
      createdAt: new Date().toISOString(),
      interestRate: 2.5,
    };
  }
}

export class CheckingAccountFactory extends BankAccountFactory {
  createAccount(userId: string, accountNumber: string, initialBalance: number): BankAccount {
    return {
      id: this.generateId(),
      userId,
      type: 'corriente',
      accountNumber,
      balance: initialBalance,
      currency: 'PEN',
      status: 'active',
      createdAt: new Date().toISOString(),
      interestRate: 0,
    };
  }
}

export class BusinessAccountFactory extends BankAccountFactory {
  createAccount(userId: string, accountNumber: string, initialBalance: number): BankAccount {
    return {
      id: this.generateId(),
      userId,
      type: 'empresarial',
      accountNumber,
      balance: initialBalance,
      currency: 'PEN',
      status: 'pending',
      createdAt: new Date().toISOString(),
      interestRate: 1.5,
    };
  }
}

export function getAccountFactory(type: AccountType): BankAccountFactory {
  switch (type) {
    case 'ahorro':
      return new SavingsAccountFactory();
    case 'corriente':
      return new CheckingAccountFactory();
    case 'empresarial':
      return new BusinessAccountFactory();
    default:
      throw new Error('Tipo de cuenta no válido');
  }
}
