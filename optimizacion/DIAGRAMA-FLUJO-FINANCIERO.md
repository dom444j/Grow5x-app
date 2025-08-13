# DIAGRAMA DE FLUJO FINANCIERO - GROWX5

## 🔄 FLUJO PRINCIPAL DE DATOS FINANCIEROS

```mermaid
graph TD
    %% USUARIOS
    U[👤 Usuario] --> |Compra Licencia| P[💳 Payment System]
    U --> |Solicita Retiro| WR[📤 Withdrawal Request]
    U --> |Ve Dashboard| UD[📊 User Dashboard]
    
    %% SISTEMA DE PAGOS
    P --> |Crea Transacción| T[📋 Transaction Model]
    P --> |Actualiza Wallet| W[🏦 Wallet Model]
    P --> |Trigger Comisión| BP[⚙️ Benefits Processor]
    
    %% PROCESAMIENTO DE BENEFICIOS
    BP --> |Día 8: Comisión Directa| CD[💰 Direct Commission]
    BP --> |Día 17: Bono Líder| BL[🎯 Leader Bonus]
    BP --> |Día 17: Bono Padre| BF[👨‍👧‍👦 Parent Bonus]
    
    %% COMISIONES
    CD --> C[📊 Commission Model]
    BL --> C
    BF --> C
    C --> |Actualiza Balance| W
    
    %% RETIROS
    WR --> |Crea Solicitud| WRM[📤 WithdrawalRequest Model]
    WRM --> |Pendiente Aprobación| A[👨‍💼 Admin Panel]
    
    %% ADMINISTRACIÓN
    A --> |Aprueba Retiro| WRM
    A --> |Procesa Comisiones| C
    A --> |Gestiona Wallets| W
    A --> |Ve Reportes| AR[📈 Admin Reports]
    
    %% FRONTEND CONNECTIONS
    UD --> |API Calls| FS[🔌 Finance Service]
    A --> |API Calls| AFS[🔌 Admin Finance Service]
    
    %% BACKEND ROUTES
    FS --> |/finance/users/:id/summary| FR[🛣️ Finance Routes]
    FS --> |/finance/users/:id/transactions| FR
    FS --> |/finance/users/:id/wallets| FR
    
    AFS --> |/admin/financial/summary| AFR[🛣️ Admin Finance Routes]
    AFS --> |/admin/referrals/commissions| RR[🛣️ Referral Routes]
    
    %% DATABASE
    FR --> DB[(🗄️ MongoDB)]
    AFR --> DB
    RR --> DB
    T --> DB
    W --> DB
    C --> DB
    WRM --> DB
    
    %% NOTIFICATIONS
    BP --> |Notifica Usuario| N[🔔 Notifications]
    WRM --> |Notifica Admin| N
    C --> |Notifica Usuario| N
    
    %% BLOCKCHAIN
    P --> |Verifica Hash| BC[⛓️ Blockchain Verification]
    BC --> |Confirma Pago| T
    
    %% AUTOMATION
    CRON[⏰ Cron Jobs] --> BP
    CRON --> |Verifica Transacciones| BC
    CRON --> |Limpia Datos| DB
```

---

## 💰 FLUJO ESPECÍFICO DE COMISIONES

```mermaid
sequenceDiagram
    participant U1 as Usuario Referidor
    participant U2 as Usuario Referido
    participant P as Payment System
    participant BP as Benefits Processor
    participant C as Commission Model
    participant W as Wallet Model
    participant N as Notifications
    
    U2->>P: Compra Licencia ($100)
    P->>BP: Trigger procesamiento (día 1)
    
    Note over BP: Día 8 - Comisión Directa
    BP->>C: Crear comisión directa (10% = $10)
    C->>W: Actualizar balance U1 (+$10)
    BP->>N: Notificar U1 (comisión recibida)
    
    Note over BP: Día 17 - Bonos Líder/Padre
    BP->>C: Crear bono líder (3% = $3)
    BP->>C: Crear bono padre (5% = $5)
    C->>W: Actualizar balance líder (+$3)
    C->>W: Actualizar balance padre (+$5)
    BP->>N: Notificar líderes (bonos recibidos)
```

---

## 🏦 FLUJO DE RETIROS

```mermaid
stateDiagram-v2
    [*] --> SolicitudRetiro: Usuario solicita retiro
    SolicitudRetiro --> Validacion: Validar monto y PIN
    Validacion --> Pendiente: Validación exitosa
    Validacion --> Rechazado: Validación fallida
    
    Pendiente --> Procesando: Admin aprueba
    Pendiente --> Cancelado: Admin rechaza
    
    Procesando --> Completado: Transacción exitosa
    Procesando --> Fallido: Error en transacción
    
    Completado --> [*]
    Rechazado --> [*]
    Cancelado --> [*]
    Fallido --> [*]
```

---

## 🔐 ARQUITECTURA DE SEGURIDAD

```mermaid
graph LR
    %% FRONTEND SECURITY
    FE[🌐 Frontend] --> |JWT Token| AUTH[🔐 Authentication]
    AUTH --> |Verify Token| BE[⚙️ Backend]
    
    %% BACKEND SECURITY
    BE --> |Validate Request| VAL[✅ Validation Layer]
    VAL --> |Check Permissions| PERM[🛡️ Permissions]
    PERM --> |Access Database| DB[(🗄️ Database)]
    
    %% ADMIN SECURITY
    ADMIN[👨‍💼 Admin Panel] --> |Admin Token| AAUTH[🔐 Admin Auth]
    AAUTH --> |Admin Permissions| APERM[🛡️ Admin Permissions]
    APERM --> |Admin Actions| ALOG[📝 Admin Logs]
    
    %% FINANCIAL SECURITY
    FIN[💰 Financial Operations] --> |PIN Verification| PIN[🔢 PIN Validation]
    PIN --> |Amount Limits| LIMITS[💵 Transaction Limits]
    LIMITS --> |Fraud Detection| FRAUD[🚨 Fraud Detection]
    
    %% BLOCKCHAIN SECURITY
    BLOCKCHAIN[⛓️ Blockchain] --> |Hash Verification| HASH[#️⃣ Hash Validation]
    HASH --> |Network Confirmation| CONF[✅ Network Confirmation]
```

---

## 📊 FLUJO DE DATOS EN TIEMPO REAL

```mermaid
graph TD
    %% WEBSOCKET CONNECTIONS
    WS[🔌 WebSocket Server] --> |Real-time Updates| UC[👤 User Clients]
    WS --> |Admin Updates| AC[👨‍💼 Admin Clients]
    
    %% EVENT TRIGGERS
    T[📋 Transaction] --> |Transaction Event| WS
    C[💰 Commission] --> |Commission Event| WS
    W[📤 Withdrawal] --> |Withdrawal Event| WS
    
    %% NOTIFICATION SYSTEM
    WS --> |Push Notification| PN[📱 Push Notifications]
    WS --> |Email Trigger| EM[📧 Email Service]
    WS --> |Telegram Bot| TG[🤖 Telegram Notifications]
    
    %% DASHBOARD UPDATES
    UC --> |Update Balance| UB[💰 User Balance]
    UC --> |Update History| UH[📋 Transaction History]
    AC --> |Update Stats| AS[📊 Admin Statistics]
    AC --> |Update Pending| AP[⏳ Pending Actions]
```

---

## 🔄 INTEGRACIÓN DE SERVICIOS

```mermaid
graph TB
    %% FRONTEND SERVICES
    subgraph "Frontend Services"
        FS[Finance Service]
        AFS[Admin Finance Service]
        RS[Referrals Service]
        PS[Payment Service]
        TS[Transaction Service]
    end
    
    %% BACKEND CONTROLLERS
    subgraph "Backend Controllers"
        FC[Finance Controller]
        AC[Admin Controller]
        RC[Referrals Controller]
        PC[Payment Controller]
        CC[Commission Controller]
    end
    
    %% DATABASE MODELS
    subgraph "Database Models"
        TM[Transaction Model]
        CM[Commission Model]
        WM[Wallet Model]
        WRM[WithdrawalRequest Model]
        UM[User Model]
    end
    
    %% EXTERNAL SERVICES
    subgraph "External Services"
        BC[Blockchain APIs]
        EM[Email Service]
        TG[Telegram Bot]
        SMS[SMS Service]
    end
    
    %% CONNECTIONS
    FS --> FC
    AFS --> AC
    RS --> RC
    PS --> PC
    TS --> FC
    
    FC --> TM
    FC --> WM
    AC --> TM
    AC --> CM
    RC --> CM
    PC --> TM
    CC --> CM
    
    PC --> BC
    FC --> EM
    AC --> TG
    RC --> SMS
```

---

## 📈 MÉTRICAS Y MONITOREO

```mermaid
graph LR
    %% DATA COLLECTION
    APP[🚀 Application] --> |Logs| LOG[📝 Logging System]
    APP --> |Metrics| MET[📊 Metrics Collector]
    APP --> |Events| EVT[🎯 Event Tracker]
    
    %% PROCESSING
    LOG --> |Process| PROC[⚙️ Data Processor]
    MET --> PROC
    EVT --> PROC
    
    %% STORAGE
    PROC --> |Store| TSDB[(📊 Time Series DB)]
    PROC --> |Aggregate| AGG[📈 Aggregated Data]
    
    %% VISUALIZATION
    TSDB --> DASH[📊 Dashboard]
    AGG --> DASH
    DASH --> |Alerts| ALERT[🚨 Alert System]
    
    %% REPORTING
    AGG --> |Generate| REP[📋 Reports]
    REP --> |Export| EXP[📤 Export System]
```

---

## 🔧 CONFIGURACIÓN Y DEPLOYMENT

```mermaid
graph TD
    %% DEVELOPMENT
    DEV[💻 Development] --> |Build| BUILD[🔨 Build Process]
    BUILD --> |Test| TEST[🧪 Testing]
    TEST --> |Deploy| STAGE[🎭 Staging]
    
    %% STAGING
    STAGE --> |Validate| VAL[✅ Validation]
    VAL --> |Approve| PROD[🚀 Production]
    
    %% PRODUCTION COMPONENTS
    PROD --> |Frontend| FE[🌐 Frontend App]
    PROD --> |Backend| BE[⚙️ Backend API]
    PROD --> |Database| DB[(🗄️ Database)]
    PROD --> |Cache| CACHE[⚡ Redis Cache]
    
    %% MONITORING
    PROD --> |Monitor| MON[📊 Monitoring]
    MON --> |Logs| LOGS[📝 Log Aggregation]
    MON --> |Metrics| METRICS[📈 Metrics Dashboard]
    MON --> |Alerts| ALERTS[🚨 Alert Manager]
    
    %% BACKUP
    DB --> |Backup| BACKUP[💾 Backup System]
    BACKUP --> |Store| STORAGE[☁️ Cloud Storage]
```

---

*Diagramas generados para visualizar el flujo completo del sistema financiero GrowX5*
*Versión: 1.0*
*Fecha: $(date)*