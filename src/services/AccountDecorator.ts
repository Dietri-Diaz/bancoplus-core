// Patrón Decorator: Agregar servicios adicionales (seguros, cashback)
import { BankAccount, AdditionalService } from '@/types';

export interface AccountComponent {
  getBalance(): number;
  getMonthlyFee(): number;
  getServices(): string[];
}

export class BasicAccount implements AccountComponent {
  constructor(protected account: BankAccount) {}

  getBalance(): number {
    return this.account.balance;
  }

  getMonthlyFee(): number {
    return 0;
  }

  getServices(): string[] {
    return ['Cuenta básica'];
  }
}

export abstract class AccountDecorator implements AccountComponent {
  constructor(protected component: AccountComponent) {}

  getBalance(): number {
    return this.component.getBalance();
  }

  getMonthlyFee(): number {
    return this.component.getMonthlyFee();
  }

  getServices(): string[] {
    return this.component.getServices();
  }
}

export class InsuranceDecorator extends AccountDecorator {
  getMonthlyFee(): number {
    return this.component.getMonthlyFee() + 25.00;
  }

  getServices(): string[] {
    return [...this.component.getServices(), 'Seguro de vida'];
  }
}

export class CashbackDecorator extends AccountDecorator {
  getMonthlyFee(): number {
    return this.component.getMonthlyFee() + 15.00;
  }

  getServices(): string[] {
    return [...this.component.getServices(), 'Cashback Premium (2%)'];
  }
}

export class AdvisoryDecorator extends AccountDecorator {
  getMonthlyFee(): number {
    return this.component.getMonthlyFee() + 50.00;
  }

  getServices(): string[] {
    return [...this.component.getServices(), 'Asesoría financiera'];
  }
}
