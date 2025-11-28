// Patrón Strategy: Calcular tasas de interés
import { AccountType } from '@/types';

export interface InterestStrategy {
  calculateInterest(balance: number, months: number): number;
  getAnnualRate(): number;
}

export class SavingsInterestStrategy implements InterestStrategy {
  private annualRate = 2.5; // 2.5%

  getAnnualRate(): number {
    return this.annualRate;
  }

  calculateInterest(balance: number, months: number): number {
    const monthlyRate = this.annualRate / 100 / 12;
    const interest = balance * monthlyRate * months;
    return Math.round(interest * 100) / 100;
  }
}

export class CheckingInterestStrategy implements InterestStrategy {
  private annualRate = 0; // Sin intereses

  getAnnualRate(): number {
    return this.annualRate;
  }

  calculateInterest(balance: number, months: number): number {
    return 0;
  }
}

export class BusinessInterestStrategy implements InterestStrategy {
  private annualRate = 1.5; // 1.5%

  getAnnualRate(): number {
    return this.annualRate;
  }

  calculateInterest(balance: number, months: number): number {
    const monthlyRate = this.annualRate / 100 / 12;
    const interest = balance * monthlyRate * months;
    return Math.round(interest * 100) / 100;
  }
}

export class InterestCalculator {
  private strategy: InterestStrategy;

  constructor(accountType: AccountType) {
    this.strategy = this.getStrategy(accountType);
  }

  private getStrategy(accountType: AccountType): InterestStrategy {
    switch (accountType) {
      case 'ahorro':
        return new SavingsInterestStrategy();
      case 'corriente':
        return new CheckingInterestStrategy();
      case 'empresarial':
        return new BusinessInterestStrategy();
      default:
        throw new Error('Tipo de cuenta no válido');
    }
  }

  setStrategy(strategy: InterestStrategy): void {
    this.strategy = strategy;
  }

  calculateInterest(balance: number, months: number): number {
    return this.strategy.calculateInterest(balance, months);
  }

  getAnnualRate(): number {
    return this.strategy.getAnnualRate();
  }
}
