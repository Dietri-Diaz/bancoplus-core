# BancoPlus - Aplicación Bancaria

## 🏦 Descripción

BancoPlus es una aplicación bancaria completa desarrollada con React, Vite.js y TypeScript que implementa patrones de diseño clásicos de ingeniería de software.

## 🎯 Funcionalidades

### Gestión de Cuentas Bancarias
- **Tipos de cuenta**: Ahorro, Corriente, Empresarial
- Creación de cuentas con diferentes tasas de interés
- Visualización de balance y proyección de intereses
- **Patrón implementado**: Factory Method

### Sistema de Créditos
- **Tipos de crédito**: Personal, Hipotecario, Empresarial
- Cálculo automático de tasas de interés según monto
- Cálculo de cuotas mensuales
- **Patrón implementado**: Abstract Factory

### Transacciones Bancarias
- **Operaciones**: Depósitos, Retiros, Transferencias
- Validación de saldo y permisos
- Historial completo de transacciones
- **Patrón implementado**: Proxy (control de acceso)

### Sistema de Autenticación
- Dos roles: **Admin** (acceso total) y **Usuario** (acceso limitado)
- Login seguro con credenciales
- Protección de rutas según rol

### Panel de Administración
- Gestión de usuarios
- Asignación de roles y permisos
- Vista completa del sistema
- **Disponible solo para Administradores**

## 🏗️ Patrones de Diseño Implementados

### 1. **Singleton** - Conexión a Base de Datos
📁 `src/services/DatabaseConnection.ts`

Asegura una única instancia de conexión a la base de datos.

```typescript
const db = DatabaseConnection.getInstance();
```

### 2. **Factory Method** - Creación de Cuentas Bancarias
📁 `src/services/AccountFactory.ts`

Crea diferentes tipos de cuentas con sus características específicas.

```typescript
const factory = getAccountFactory('ahorro');
const account = factory.createAccount(userId, accountNumber, balance);
```

### 3. **Abstract Factory** - Sistema de Créditos
📁 `src/services/CreditFactory.ts`

Familia de fábricas para crear diferentes tipos de créditos.

```typescript
const factory = getCreditFactory('personal');
const credit = factory.createCredit(userId, amount, term);
```

### 4. **Decorator** - Servicios Adicionales
📁 `src/services/AccountDecorator.ts`

Añade servicios extra a las cuentas (seguros, cashback, asesoría).

```typescript
let account = new BasicAccount(bankAccount);
account = new InsuranceDecorator(account);
account = new CashbackDecorator(account);
```

### 5. **Proxy** - Control de Acceso
📁 `src/services/AccountProxy.ts`

Controla y valida el acceso a las cuentas bancarias.

```typescript
const proxy = new AccountProxyAccess(userId, userRole);
const account = await proxy.getAccount(accountId);
```

### 6. **Strategy** - Cálculo de Intereses
📁 `src/services/InterestStrategy.ts`

Diferentes estrategias para calcular intereses según tipo de cuenta.

```typescript
const calculator = new InterestCalculator('ahorro');
const interest = calculator.calculateInterest(balance, months);
```

## 🚀 Instalación y Ejecución

### Prerrequisitos
- Node.js (v18 o superior)
- npm o yarn

### Paso 1: Instalar dependencias
```bash
npm install
```

### Paso 2: Iniciar el servidor de base de datos (json-server)
Abre una **PRIMERA terminal** y ejecuta:
```bash
npx json-server --watch db.json --port 3000
```

Este comando iniciará el servidor de base de datos en `http://localhost:3000`

### Paso 3: Iniciar la aplicación
Abre una **SEGUNDA terminal** y ejecuta:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:8080`

## 👥 Credenciales de Prueba

### Cuenta Administrador
- **Email**: admin@bancoplus.com
- **Contraseña**: admin123
- **Acceso**: Panel completo + gestión de usuarios

### Cuenta Usuario
- **Email**: usuario@bancoplus.com
- **Contraseña**: user123
- **Acceso**: Sus propias cuentas y transacciones

### Cuenta Usuario 2
- **Email**: maria@bancoplus.com
- **Contraseña**: user123
- **Acceso**: Sus propias cuentas y transacciones

## 📊 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI (shadcn)
│   ├── Sidebar.tsx     # Navegación lateral
│   └── ProtectedRoute.tsx  # Protección de rutas
├── contexts/           # Contextos de React
│   └── AuthContext.tsx # Contexto de autenticación
├── pages/              # Páginas de la aplicación
│   ├── Login.tsx       # Página de inicio de sesión
│   ├── Dashboard.tsx   # Dashboard principal
│   ├── Accounts.tsx    # Gestión de cuentas
│   ├── Credits.tsx     # Gestión de créditos
│   ├── Transactions.tsx # Transacciones
│   └── Admin.tsx       # Panel de administración
├── services/           # Lógica de negocio y patrones
│   ├── DatabaseConnection.ts     # Singleton
│   ├── AccountFactory.ts         # Factory Method
│   ├── CreditFactory.ts          # Abstract Factory
│   ├── AccountDecorator.ts       # Decorator
│   ├── AccountProxy.ts           # Proxy
│   └── InterestStrategy.ts       # Strategy
├── types/              # Definiciones de TypeScript
│   └── index.ts        # Interfaces y tipos
└── db.json             # Base de datos simulada
```

## 🎨 Tecnologías Utilizadas

- **React 18** - Framework de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes de UI
- **json-server** - API REST simulada
- **React Router** - Navegación
- **Lucide React** - Iconos

## 📝 Características Adicionales

- ✅ Diseño responsive
- ✅ Tema moderno y profesional
- ✅ Validaciones de formularios
- ✅ Notificaciones toast
- ✅ Protección de rutas
- ✅ Gestión de estado con Context API
- ✅ Código TypeScript tipado
- ✅ Componentes reutilizables

## 🔐 Seguridad

- Validación de credenciales
- Protección de rutas según rol
- Proxy para control de acceso a cuentas
- Validación de permisos en transacciones

## 📚 Conceptos de Programación

Este proyecto es ideal para aprender:
- Patrones de diseño en JavaScript/TypeScript
- Arquitectura de aplicaciones React
- Gestión de estado y contextos
- TypeScript avanzado
- Principios SOLID
- Separación de responsabilidades

## 🐛 Troubleshooting

### Error: "Failed to fetch"
Asegúrate de que json-server esté corriendo en el puerto 3000.

### Error: Puerto en uso
Si el puerto 8080 está ocupado, Vite usará automáticamente el siguiente disponible.

### Base de datos no se actualiza
Verifica que el archivo db.json exista en la raíz del proyecto.

## 📄 Licencia

Este proyecto es con fines educativos.
