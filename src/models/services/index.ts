// ============================================
// MODEL - SERVICES INDEX
// ============================================
// Exporta todos los servicios con patrones de diseño

// Singleton Pattern
export { default as DatabaseConnection } from './DatabaseConnection';

// Factory Method Pattern
export { 
  BankAccountFactory, 
  SavingsAccountFactory, 
  CheckingAccountFactory, 
  BusinessAccountFactory, 
  getAccountFactory 
} from './AccountFactory';

// Abstract Factory Pattern
export { 
  PersonalCreditFactory, 
  MortgageCreditFactory, 
  BusinessCreditFactory, 
  getCreditFactory,
  type CreditFactory 
} from './CreditFactory';

// Strategy Pattern
export { 
  InterestCalculator,
  SavingsInterestStrategy,
  CheckingInterestStrategy,
  BusinessInterestStrategy,
  type InterestStrategy 
} from './InterestStrategy';

// Decorator Pattern
export { 
  AccountDecorator,
  InsuranceDecorator,
  CashbackDecorator,
  FullServiceDecorator,
  type AccountWithServices 
} from './AccountDecorator';

// Proxy Pattern
export { AccountProxyAccess } from './AccountProxy';

// Credit Score Service (Singleton)
export { CreditScoreService, default as CreditScoreServiceDefault } from './CreditScoreService';
