// Patrón Abstract Factory: Crear sistemas de crédito
import { Credit, CreditType } from '@/types';

export interface CreditFactory {
  createCredit(userId: string, amount: number, term: number): Credit;
  calculateInterestRate(amount: number): number;
  calculateMonthlyPayment(amount: number, rate: number, term: number): number;
}

export class PersonalCreditFactory implements CreditFactory {
  calculateInterestRate(amount: number): number {
    // Tasas basadas en el monto
    if (amount < 5000) return 15.0;
    if (amount < 15000) return 12.5;
    return 10.0;
  }

  calculateMonthlyPayment(amount: number, rate: number, term: number): number {
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                    (Math.pow(1 + monthlyRate, term) - 1);
    return Math.round(payment * 100) / 100;
  }

  createCredit(userId: string, amount: number, term: number): Credit {
    const rate = this.calculateInterestRate(amount);
    return {
      id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'personal',
      amount,
      interestRate: rate,
      term,
      monthlyPayment: this.calculateMonthlyPayment(amount, rate, term),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
  }
}

export class MortgageCreditFactory implements CreditFactory {
  calculateInterestRate(amount: number): number {
    // Tasas más bajas para hipotecas
    if (amount < 100000) return 8.5;
    if (amount < 200000) return 7.5;
    return 6.5;
  }

  calculateMonthlyPayment(amount: number, rate: number, term: number): number {
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                    (Math.pow(1 + monthlyRate, term) - 1);
    return Math.round(payment * 100) / 100;
  }

  createCredit(userId: string, amount: number, term: number): Credit {
    const rate = this.calculateInterestRate(amount);
    return {
      id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'hipotecario',
      amount,
      interestRate: rate,
      term,
      monthlyPayment: this.calculateMonthlyPayment(amount, rate, term),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
  }
}

export class BusinessCreditFactory implements CreditFactory {
  calculateInterestRate(amount: number): number {
    // Tasas comerciales
    if (amount < 50000) return 14.0;
    if (amount < 100000) return 11.5;
    return 9.0;
  }

  calculateMonthlyPayment(amount: number, rate: number, term: number): number {
    const monthlyRate = rate / 100 / 12;
    const payment = (amount * monthlyRate * Math.pow(1 + monthlyRate, term)) / 
                    (Math.pow(1 + monthlyRate, term) - 1);
    return Math.round(payment * 100) / 100;
  }

  createCredit(userId: string, amount: number, term: number): Credit {
    const rate = this.calculateInterestRate(amount);
    return {
      id: `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: 'empresarial',
      amount,
      interestRate: rate,
      term,
      monthlyPayment: this.calculateMonthlyPayment(amount, rate, term),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    };
  }
}

export function getCreditFactory(type: CreditType): CreditFactory {
  switch (type) {
    case 'personal':
      return new PersonalCreditFactory();
    case 'hipotecario':
      return new MortgageCreditFactory();
    case 'empresarial':
      return new BusinessCreditFactory();
    default:
      throw new Error('Tipo de crédito no válido');
  }
}
