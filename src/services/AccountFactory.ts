// Patrón Factory Method: Crear tipos de cuentas bancarias
import { BankAccount, AccountType } from '@/types';

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
      interestRate: 2.5, // 2.5% anual para cuentas de ahorro
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
      interestRate: 0, // Sin intereses para cuentas corrientes
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
      status: 'pending', // Requiere aprobación del admin
      createdAt: new Date().toISOString(),
      interestRate: 1.5, // 1.5% anual para cuentas empresariales
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
