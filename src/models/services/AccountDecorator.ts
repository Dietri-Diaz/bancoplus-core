// ============================================
// MODEL - SERVICE: Decorator Pattern
// ============================================
// Patrón Decorator: Agregar servicios adicionales a las cuentas
// Permite añadir funcionalidades sin modificar la clase original

import { BankAccount, AdditionalService } from '@/models/entities';

export interface AccountWithServices extends BankAccount {
  services: AdditionalService[];
  totalServicesCost: number;
}

export abstract class AccountDecorator {
  protected account: BankAccount;
  protected services: AdditionalService[] = [];

  constructor(account: BankAccount) {
    this.account = account;
  }

  abstract addService(service: AdditionalService): void;
  abstract getTotalCost(): number;
  abstract getDescription(): string;

  getAccount(): AccountWithServices {
    return {
      ...this.account,
      services: this.services,
      totalServicesCost: this.getTotalCost(),
    };
  }
}

export class InsuranceDecorator extends AccountDecorator {
  addService(service: AdditionalService): void {
    if (service.type === 'insurance') {
      this.services.push(service);
    }
  }

  getTotalCost(): number {
    return this.services.reduce((total, s) => total + s.price, 0);
  }

  getDescription(): string {
    const serviceNames = this.services.map(s => s.name).join(', ');
    return `Cuenta con seguros: ${serviceNames}`;
  }
}

export class CashbackDecorator extends AccountDecorator {
  private cashbackRate = 0.02;

  addService(service: AdditionalService): void {
    if (service.type === 'cashback') {
      this.services.push(service);
    }
  }

  getTotalCost(): number {
    return this.services.reduce((total, s) => total + s.price, 0);
  }

  getDescription(): string {
    return `Cuenta con ${this.cashbackRate * 100}% cashback en compras`;
  }

  calculateCashback(transactionAmount: number): number {
    return transactionAmount * this.cashbackRate;
  }
}

export class FullServiceDecorator extends AccountDecorator {
  addService(service: AdditionalService): void {
    this.services.push(service);
  }

  getTotalCost(): number {
    return this.services.reduce((total, s) => total + s.price, 0);
  }

  getDescription(): string {
    const serviceNames = this.services.map(s => s.name).join(', ');
    return `Cuenta premium con: ${serviceNames}`;
  }
}
