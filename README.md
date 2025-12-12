# MicroInvent: Sistema de Inventario Distribuido & PWA

![Status](https://img.shields.io/badge/Status-In%20Development-yellow) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Índice

- [Descripcion del Proyecto](#descripcion-del-proyecto)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Responsabilidades por Modulo](#responsabilidades-por-modulo)
- [Instalacion y Configuracion Local](#instalacion-y-configuracion-local)
   - [Opcion 1: Con Docker (Recomendado)](#opcion-1-con-docker-recomendado)
   - [Opcion 2: Instalacion Manual](#opcion-2-instalacion-manual)
- [Guia de Usuario](#guia-de-usuario)
   - [Roles y Permisos](#roles-y-permisos)
- [Funcionalidades y Uso (online y offline)](#funcionalidades-y-uso-online-y-offline)
- [Arquitectura de Base de Datos](#arquitectura-de-base-de-datos)
- [Despliegue en AWS](#despliegue-en-aws)
- [Credenciales de Prueba](#credenciales-de-prueba)

---

## Descripcion del Proyecto

MicroInvent es una Aplicación Web Progresiva (PWA) diseñada para gestionar inventarios en tiempo real para negocios con múltiples sucursales. El sistema resuelve problemas de inconsistencia de stock mediante una arquitectura **Offline-First**, sincronización automática y manejo de concurrencia distribuida.

El proyecto está diseñado para ser desplegado en **AWS** utilizando servicios gestionados para garantizar escalabilidad y alta disponibilidad.

---

## Tecnologias Utilizadas

La arquitectura ha sido seleccionada para cumplir con los requisitos de alto rendimiento, funcionamiento sin conexión y actualizaciones en tiempo real.

### Frontend (PWA Offline-First)

- **Core:** React.js 18+ con Vite
- **Routing:** React Router DOM v6
- **Estado & Sync:** TanStack Query (React Query) para gestión de estado asíncrono y caché
- **Base de Datos Local:** Dexie.js (Wrapper para IndexedDB) para almacenamiento offline
- **Estilos:** TailwindCSS para diseño responsive
- **Iconos:** Lucide React
- **Formularios:** Manejo nativo con validación
- **PWA:** Service Workers para funcionalidad offline

### Backend (API RESTful)

- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Autenticación:** JWT (jsonwebtoken) + bcryptjs para hashing
- **Base de Datos:** PostgreSQL 14+
- **ORM/Query:** pg (node-postgres) - Queries directos
- **Validación:** Validaciones manuales y middleware personalizado
- **CORS:** cors para comunicación cross-origin
- **Variables de Entorno:** dotenv

### Base de Datos

- **Motor:** PostgreSQL 14+
- **Características:**
  - Transacciones ACID
  - Índices para optimización de consultas
  - Constraints para integridad referencial
  - Triggers para auditoría (futuro)

### DevOps & Infraestructura

- **Containerización:** Docker + Docker Compose
- **Control de Versiones:** Git + GitHub
- **Despliegue (Planeado):** AWS (Amplify + Elastic Beanstalk + RDS)

---

## Responsabilidades por Modulo

El desarrollo se divide por dominios funcionales para mantener la independencia del código y facilitar la colaboración.

| Desarrollador | Módulo / Funcionalidad | Descripción Técnica |
|:---|:---|:---|
| **Jorge** | **Frontend + Backend** | Desarrollo completo de la PWA (React + Vite, React Query, Dexie/IndexedDB, Tailwind), API REST en Express/Node, PostgreSQL, autenticación JWT, roles (SuperAdmin/Admin/Employee), inventario, movimientos, transferencias, reportes, sincronización offline/online y experiencia de usuario. |
| **Angel** | **Despliegue en AWS** | Diseño y operación del plan de despliegue en AWS (Amplify/Elastic Beanstalk/RDS/S3), contenedores Docker, pipelines y hardening de la infraestructura. |

---

## Instalacion y Configuracion Local

### Opcion 1: Con Docker (Recomendado)

#### Prerrequisitos (Docker)

- Docker Desktop instalado
- Git

#### Pasos (Docker)

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/Yourchh/MicroInvent.git
   cd microinvent
   ```

2. **Configurar variables de entorno:**

   Crear archivo `.env` en la carpeta `/server`:

   ```bash
   cd server
   cp env.example .env
   ```

   Editar `.env` con los siguientes valores:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=admin
   DB_PASSWORD=adminpassword
   DB_NAME=microinvent
   JWT_SECRET= "tusecretoaqui"
   NODE_ENV=development
   ```

3. **Iniciar contenedores:**

   Desde la raíz del proyecto:

   ```bash
   cd ..
   docker-compose up -d
   ```

   Esto iniciará:
   - PostgreSQL en puerto `5432`
   - Backend (API) en puerto `3000`
   - Frontend en puerto `5173`

4. **Iniciar Servidor y Cliente**

   Iniciar Server

   ```bash
   cd /microinvent/server/
   npm install
   npm run dev
   ```

   Iniciar Client

   ```bash
   cd /microinvent/client/
   npm install
   npm run dev
   ```


5. **Inicializar la base de datos:**

   ```bash
   docker exec -i microinvent_db psql -U admin -d microinvent < database/init.sql
   docker exec -i microinvent_db psql -U admin -d microinvent < database/migrate_roles.sql

   #Ejecute este comando para borrar todo el esquema público en caso que necesite iniciar de nuevo
   docker exec -i microinvent_db psql -U admin -d microinvent -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```

6. **Acceder a la aplicación:**

   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

7. **Build y preview (frontend):**

   ```bash
   cd client
   npm run build   # genera artefactos en dist/
   npm run preview # sirve el build local en http://localhost:4173
   ```

   Úsalo para validar el paquete PWA ya empacado y probar la instalación/descarga local en modo producción.

### Opcion 2: Instalacion Manual

#### Prerrequisitos (Manual)

- Node.js v18+
- PostgreSQL 14+
- npm o yarn

#### Pasos (Manual)

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/Yourchh/MicroInvent.git
   cd microinvent
   ```

2. **Configurar PostgreSQL:**

   Crear base de datos:

   ```bash
   createdb microinvent
   psql -d microinvent -f database/init.sql
   psql -d microinvent -f database/migrate_roles.sql
   ```

3. **Configurar Backend:**

   ```bash
   cd server
   npm install
   cp env.example .env
   # Editar .env con tus credenciales de PostgreSQL
   npm run dev
   ```

4. **Configurar Frontend:**

   En otra terminal:

   ```bash
   cd client
   npm install
   npm run dev
   ```

5. **Acceder a la aplicación:**

   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:3000](http://localhost:3000)

---

## Guia de Usuario

### Instalación de la PWA en Chrome

MicroInvent es una Aplicación Web Progresiva (PWA) que puede instalarse en tu dispositivo para funcionar como una aplicación nativa, incluso sin conexión a internet.

#### Cómo Instalar en Chrome (Desktop)

1. **Acceder a la aplicación:**
   - Abre Google Chrome
   - Navega a `http://localhost:5173` (desarrollo local)
   
2. **Instalar la aplicación:**
   
   Tienes dos opciones:
   
   **Opción A - Desde la barra de direcciones:**
   - Busca el icono de instalación en la esquina derecha de la barra de direcciones
   - Haz clic en el icono
   
   **Opción B - Desde el menú:**
   - Haz clic en el menú de Chrome (tres puntos) en la esquina superior derecha
   - Selecciona **"Guardar y compartir"** -> **"Instalar MicroInvent"**
   
   ![Instalar PWA Chrome](docs/screenshots/install-pwa-chrome.png)

3. **Confirmar instalación:**
   - Aparecerá un cuadro de diálogo de confirmación
   - Haz clic en **"Instalar"**
   - La aplicación se abrirá automáticamente en una ventana independiente

4. **Acceso rápido:**
   - MicroInvent aparecerá como aplicación en:
     - Tu escritorio (si marcaste la opción)
     - El menú de aplicaciones de tu sistema operativo
     - La barra de tareas
   - Chrome -> Apps (chrome://apps/)
   - Podrás iniciarla como cualquier aplicación de escritorio, sin necesidad de abrir el navegador

#### Cómo Instalar en Chrome (Android)

1. **Abrir en Chrome:**
   - Abre Google Chrome en tu dispositivo Android
   - Navega a la URL de la aplicación
   
2. **Instalar:**
   - Aparecerá un banner en la parte inferior: **"Agregar MicroInvent a la pantalla de inicio"**
   - Toca **"Instalar"** o **"Agregar"**
   
   Si no aparece el banner:
   - Toca el menú (⋮) → **"Agregar a pantalla de inicio"** o **"Instalar aplicación"**
   
   ![Instalar PWA Android](docs/screenshots/install-pwa-android.png)

3. **Usar la app:**
   - El icono de MicroInvent aparecerá en tu pantalla de inicio
   - Ábrela como cualquier otra aplicación
   - Funcionará incluso sin conexión a internet

#### Ventajas de Instalar la PWA

- Funciona sin internet: accede a tus datos y realiza cambios incluso offline.
- Experiencia nativa: se ejecuta en su propia ventana, sin barras del navegador.
- Sincronización automática: los cambios offline se sincronizan al recuperar conexión.
- Acceso rápido: lanza la app desde tu escritorio o pantalla de inicio en un clic.
- Almacenamiento local: los datos se guardan en el dispositivo para acceso instantáneo.
- Actualizaciones automáticas: la app se actualiza automáticamente cuando hay nuevas versiones.

#### Desinstalar la PWA

**En Desktop:**

- Abre la aplicación
- Haz clic en el menú (⋮) → **"Desinstalar MicroInvent"**
- O desde Chrome: chrome://apps/ → clic derecho en MicroInvent → **"Eliminar de Chrome"**

**En Android:**

- Mantén presionado el icono de la app
- Selecciona **"Desinstalar"** o arrastra a la papelera

### Inicio de Sesión

El sistema cuenta con un flujo de autenticación de dos fases para administradores:

![Pantalla de Inicio de Sesión](docs/screenshots/login.png)

1. **Selección de Tipo de Usuario:**
   - Empleado: Acceso directo
   - Administrador: Requiere selección de sucursal

2. **Credenciales:**
   - Ingresa tu usuario y contraseña
   - Los empleados acceden directamente a su dashboard
   - Los administradores deben seleccionar su sucursal

![Selección de Sucursal](docs/screenshots/branch-selection.png)

### Roles y Permisos

MicroInvent implementa un sistema de roles jerárquico con permisos específicos:

#### SuperAdmin

- **Acceso:** Total y sin restricciones
- **Sucursal:** No asignado (puede cambiar entre todas las sucursales)
- **Permisos:**
  - Ver y gestionar todas las sucursales
  - Crear/editar/eliminar sucursales
  - Crear usuarios con cualquier rol (incluyendo otros SuperAdmins)
  - Ver y gestionar todos los usuarios del sistema
  - Acceso a módulo de Configuración completo
  - Resetear sistema completo
  - Ver inventario de cualquier sucursal
  - Generar reportes globales

#### Admin

- **Acceso:** Administración de una sucursal específica
- **Sucursal:** Asignado a una sucursal fija
- **Permisos:**
  - Ver solo usuarios de su sucursal
  - Crear/editar/eliminar empleados de su sucursal
  - No puede crear otros admins
  - No puede cambiar de sucursal
  - Ver inventario de su sucursal
  - Gestionar productos de su sucursal
  - Ver reportes de su sucursal
  - Ver configuración (solo lectura)

#### Manager (Gerente)

- **Acceso:** Gestión operativa y de reportes de su sucursal
- **Sucursal:** Asignado a una sucursal fija
- **Permisos:**
  - Ver inventario y movimientos de su sucursal
  - Generar y visualizar reportes de su sucursal
  - Gestionar productos y stock de su sucursal
  - Aprobar/operar transferencias donde su sucursal participa
  - Gestionar usuarios de su sucursal únicamente con rol Employee (crear/editar/eliminar)
  - No puede cambiar de sucursal
  - Sin acceso a configuración global

#### Employee (Empleado)

- **Acceso:** Operación básica de inventario
- **Sucursal:** Asignado a una sucursal fija
- **Permisos:**
  - Ver inventario de su sucursal
  - Registrar movimientos de inventario
  - Ver dashboard de su sucursal
  - No puede gestionar usuarios
  - No puede acceder a configuración
  - No puede cambiar de sucursal

### Funcionalidades y Uso (online y offline)

Las siguientes funcionalidades operan de forma consistente tanto en línea como fuera de línea; cuando no hay red, los cambios se encolan y se sincronizan automáticamente al restablecer la conexión.

#### Dashboard

- Ver métricas clave: valor total, productos, stock bajo y movimientos recientes.
- SuperAdmin puede cambiar de sucursal desde el selector superior para ver datos de cualquier sede.
- Online u offline: los datos se muestran desde caché y se sincronizan al volver la conexión.

#### Inventario

- Buscar y filtrar productos, ver stock en tiempo real (por sucursal).
- Crear/editar/eliminar productos. SuperAdmin puede cambiar de sucursal y gestionar cualquier inventario; Admin/Employee solo su sucursal.
- Offline: los cambios se encolan y se sincronizan automáticamente cuando vuelve la red.

#### Movimientos

- Registrar entradas, salidas y ajustes con motivo y cantidad.
- Historial visible por sucursal. SuperAdmin ve todos los movimientos; otros roles solo su sede.
- Offline: se guarda en IndexedDB y se envía al servidor al recuperar conexión.

#### Transferencias entre Sucursales

- Flujo: Solicitar -> Aprobar -> Enviar -> Completar/Recibir.
- SuperAdmin puede ver y operar sobre todas las sucursales. Admin/Employee operan solo su sucursal.
- Estados soportados: PENDING, IN_TRANSIT, COMPLETED, REJECTED.

#### Reportes (exportables a PDF)

- Pestañas: Stock Real, Auditoría (movimientos), Financiero, Stock Bajo, Transferencias.
- Botón "Exportar Vista" genera PDF de la pestaña actual; "Descargar Todo" genera consolidado.
- Offline: genera PDF con los datos cacheados; al reconectar, refresca al último estado del servidor.

#### Usuarios

- SuperAdmin: CRUD completo, asignación de roles y sucursales.
- Admin: CRUD de empleados de su sucursal; no cambia roles ni sucursales.
- Employee: sin acceso a gestión de usuarios.

#### Configuracion

- SuperAdmin: crear/eliminar sucursales, zona de peligro (reset del sistema con confirmación).
- Admin: vista de solo lectura de sucursales y configuración general.

### Modo Offline

MicroInvent funciona sin conexión a internet gracias a su arquitectura PWA:

![Modo Offline](docs/screenshots/offline-mode.png)

1. **Almacenamiento Local:** Los datos se guardan en IndexedDB
2. **Cola de Sincronización:** Las acciones offline se encolan
3. **Sincronización Automática:** Al recuperar conexión, los cambios se sincronizan automáticamente
4. **Indicadores Visuales:**
   - Estado Online: sincronización en tiempo real
   - Estado Offline: modo local, cambios en cola
   - Estado Pendiente: acciones esperando sincronización

![Indicador de Sincronización](docs/screenshots/sync-indicator.png)

**Acciones soportadas en modo offline:**

- Crear, editar y eliminar productos
- Crear, editar y eliminar usuarios
- Visualizar inventario
- Ver dashboard y métricas

---


## Arquitectura de Base de Datos

El esquema utiliza un diseño optimizado para transacciones concurrentes con integridad referencial.

### Tablas Principales

- `users` - Usuarios del sistema con roles y asignación a sucursales
  - Campos: id, username, password_hash, role, branch_id, created_at
  - Roles: superadmin, admin, employee

- `branches` - Sucursales del negocio
  - Campos: id, name, address, created_at

- `products` - Catálogo de productos por sucursal
  - Campos: id, sku, name, quantity, min_stock, price, branch_id, created_at

- `sessions` - Control de sesiones activas por usuario y sucursal
  - Campos: id, user_id, branch_id, created_at
  - Constraint: UNIQUE(user_id, branch_id)

### Relaciones

- **users.branch_id** -> branches.id (Asignación de usuario a sucursal)
- **products.branch_id** -> branches.id (Productos por sucursal)
- **sessions.user_id** -> users.id (Sesiones de usuario)
- **sessions.branch_id** -> branches.id (Sesión en sucursal específica)

---

## Despliegue en AWS

El proyecto está diseñado para desplegarse en AWS usando servicios administrados:

### Arquitectura Planeada

- **Frontend:** AWS Amplify (Hosting estático con CDN)
- **Backend:** AWS Elastic Beanstalk (Auto-scaling + Load Balancer)
- **Base de Datos:** Amazon RDS PostgreSQL (Multi-AZ para alta disponibilidad)
- **Almacenamiento:** Amazon S3 (Reportes y archivos estáticos)

---

## Credenciales de Prueba

Después de ejecutar los scripts de migración, el sistema incluye este usuarios de prueba:

| Usuario | Contraseña | Rol | Sucursal |
|:---|:---|:---|:---|
| `superadmin` | `super123` | SuperAdmin | Sin asignar |

Inicie sesion como administrador con estas credenciales para que pueda crear nuevos usuarios y sucursales 

## Desarrolladores

- **Jorge** - Desarrollo completo de backend y frontend (API Express/PostgreSQL, PWA React/Vite, sincronización offline/online, inventario, movimientos, transferencias, reportes, UX).
- **Angel** - Despliegue en AWS (Amplify/Elastic Beanstalk/RDS/S3), contenedores Docker y pipelines de publicación.

---

**Proyecto desarrollado para las materias de:**

- Desarrollo y Despliegue de Aplicaciones en La Nube
- Programación Web para Clientes y Usabilidad
- Desarrollo Backend con Frameworks Modernos
- Gestión de Proyectos de Software
