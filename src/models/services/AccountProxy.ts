// ============================================
// MODEL - SERVICE: Proxy Pattern
// ============================================
// Patrón Proxy: Controlar acceso a cuentas bancarias
// Añade cache y control de permisos antes de acceder a los datos

import { BankAccount } from '@/models/entities';
import DatabaseConnection from './DatabaseConnection';

interface AccountAccess {
  getAccount(accountId: string): Promise<BankAccount>;
  updateBalance(accountId: string, newBalance: number): Promise<BankAccount>;
}

class RealAccountAccess implements AccountAccess {
  private db = DatabaseConnection.getInstance();

  async getAccount(accountId: string): Promise<BankAccount> {
    const accounts = await this.db.get<BankAccount[]>('/accounts');
    const account = accounts.find(a => a.id === accountId);
    if (!account) throw new Error('Cuenta no encontrada');
    return account;
  }

  async updateBalance(accountId: string, newBalance: number): Promise<BankAccount> {
    const account = await this.getAccount(accountId);
    const updated = { ...account, balance: newBalance };
    return await this.db.put<BankAccount>(`/accounts/${accountId}`, updated);
  }
}

export class AccountProxyAccess implements AccountAccess {
  private realAccess: RealAccountAccess;
  private cache: Map<string, { data: BankAccount; timestamp: number }> = new Map();
  private cacheTimeout = 30000;
  private userId: string;
  private userRole: string;

  constructor(userId: string, userRole: string) {
    this.realAccess = new RealAccountAccess();
    this.userId = userId;
    this.userRole = userRole;
  }

  private hasPermission(account: BankAccount): boolean {
    return this.userRole === 'admin' || account.userId === this.userId;
  }

  private isCacheValid(accountId: string): boolean {
    const cached = this.cache.get(accountId);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  async getAccount(accountId: string): Promise<BankAccount> {
    if (this.isCacheValid(accountId)) {
      const cached = this.cache.get(accountId)!;
      if (this.hasPermission(cached.data)) {
        console.log('📦 Proxy: Retornando cuenta desde cache');
        return cached.data;
      }
    }

    console.log('🔄 Proxy: Obteniendo cuenta desde base de datos');
    const account = await this.realAccess.getAccount(accountId);
    
    if (!this.hasPermission(account)) {
      throw new Error('No tienes permiso para acceder a esta cuenta');
    }

    this.cache.set(accountId, { data: account, timestamp: Date.now() });
    return account;
  }

  async updateBalance(accountId: string, newBalance: number): Promise<BankAccount> {
    const account = await this.getAccount(accountId);
    
    if (!this.hasPermission(account)) {
      throw new Error('No tienes permiso para modificar esta cuenta');
    }

    console.log('💰 Proxy: Actualizando balance con validación');
    const updated = await this.realAccess.updateBalance(accountId, newBalance);
    this.cache.set(accountId, { data: updated, timestamp: Date.now() });
    return updated;
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Proxy: Cache limpiado');
  }
}
