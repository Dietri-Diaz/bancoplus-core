# Arquitectura MVC - BancoPlus

## Estructura del Proyecto

```
src/
├── models/              # MODEL - Datos y Lógica de Negocio
│   ├── entities/        # Tipos e interfaces del dominio
│   │   └── index.ts     # User, BankAccount, Credit, Payment, etc.
│   └── services/        # Servicios con Patrones de Diseño
│       ├── DatabaseConnection.ts   # Patrón Singleton
│       ├── AccountFactory.ts       # Patrón Factory Method
│       ├── CreditFactory.ts        # Patrón Abstract Factory
│       ├── InterestStrategy.ts     # Patrón Strategy
│       ├── AccountDecorator.ts     # Patrón Decorator
│       ├── AccountProxy.ts         # Patrón Proxy
│       └── CreditScoreService.ts   # Servicio de Score
│
├── views/               # VIEW - Interfaz de Usuario
│   ├── pages/           # Páginas principales
│   │   └── Accounts.tsx # Ejemplo con MVC
│   └── components/      # Componentes reutilizables
│       ├── Sidebar.tsx
│       └── ProtectedRoute.tsx
│
├── controllers/         # CONTROLLER - Conexión Model-View
│   ├── useAccounts.ts   # Hook para cuentas
│   ├── useCredits.ts    # Hook para créditos
│   ├── usePayments.ts   # Hook para pagos
│   └── useTransactions.ts # Hook para transacciones
│
└── contexts/            # Contextos de React (Auth)
```

## Patrones de Diseño Implementados

| Patrón | Archivo | Descripción |
|--------|---------|-------------|
| **Singleton** | DatabaseConnection.ts | Única conexión a la base de datos |
| **Factory Method** | AccountFactory.ts | Crear tipos de cuentas bancarias |
| **Abstract Factory** | CreditFactory.ts | Crear sistemas de crédito |
| **Strategy** | InterestStrategy.ts | Calcular tasas de interés |
| **Decorator** | AccountDecorator.ts | Agregar servicios adicionales |
| **Proxy** | AccountProxy.ts | Control de acceso a cuentas |

## Flujo MVC

1. **Usuario** interactúa con la **View** (páginas/componentes)
2. La **View** usa **Controllers** (hooks) para obtener/modificar datos
3. Los **Controllers** utilizan **Models** (services) para la lógica
4. El **Model** retorna datos al **Controller**
5. El **Controller** actualiza la **View**
