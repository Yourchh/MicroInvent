# MicroInvent: Sistema de Inventario Distribuido & PWA

![Status](https://img.shields.io/badge/Status-In%20Development-yellow) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 📖 Descripción del Proyecto
MicroInvent es una Aplicación Web Progresiva (PWA) diseñada para gestionar inventarios en tiempo real para negocios con múltiples sucursales. [cite_start]El sistema resuelve problemas de inconsistencia de stock mediante una arquitectura **Offline-First**, sincronización automática y manejo de concurrencia distribuida[cite: 5, 10].

El proyecto está diseñado para ser desplegado en **AWS** utilizando servicios gestionados para garantizar escalabilidad y alta disponibilidad.

## 🛠 Stack Tecnológico

[cite_start]La arquitectura ha sido seleccionada para cumplir con los requisitos de alto rendimiento, funcionamiento sin conexión y actualizaciones en tiempo real[cite: 7].

### Frontend (PWA Offline-First)
* [cite_start]**Core:** React.js + Vite[cite: 10].
* **Estado & Sync:** TanStack Query (Gestión de estado asíncrono y caché).
* [cite_start]**Base de Datos Local:** Dexie.js (Wrapper para IndexedDB) para almacenamiento offline[cite: 118].
* **Estilos:** TailwindCSS (para diseño responsive rápido).
* [cite_start]**Tiempo Real:** Socket.io Client[cite: 14].

### Backend (API RESTful & Microservicios Lógicos)
* [cite_start]**Runtime:** Node.js[cite: 13].
* **Framework:** Express.js.
* **Validación:** Joi/Zod.
* [cite_start]**Seguridad:** JWT para autenticación y Bcrypt para hashing[cite: 13].

### Base de Datos & Caché
* [cite_start]**Relacional:** PostgreSQL (Motor principal transaccional)[cite: 16].
* [cite_start]**Caché:** Redis (Para sesiones y consultas frecuentes de catálogo)[cite: 57, 108].
* [cite_start]**Control de Concurrencia:** Optimistic Locking (campo `version` en tablas críticas)[cite: 97].

### [cite_start]Infraestructura Cloud (AWS) [cite: 19, 141]
* **Frontend Hosting:** AWS Amplify.
* **Backend Hosting:** AWS Elastic Beanstalk (Load Balancer + Auto-scaling).
* **Database:** Amazon RDS (PostgreSQL).
* [cite_start]**Storage:** Amazon S3 (Almacenamiento de reportes/imágenes)[cite: 148].

---

## 👥 Asignación de Módulos y Responsabilidades

El desarrollo se divide por dominios funcionales para mantener la independencia del código y facilitar la colaboración.

| Desarrollador | Módulo / Funcionalidad | Descripción Técnica |
| :--- | :--- | :--- |
| **Jorge** | [cite_start]**Autenticación y Autorización** [cite: 25] | Implementación de JWT, Middleware de protección de rutas, Roles (Admin/Sucursal). |
| **Jorge** | [cite_start]**Inventario por Sucursal** [cite: 26] | CRUD de productos, visualización de stock en tiempo real, manejo de alertas de stock bajo. |
| **Jorge** | [cite_start]**Reportes y Análisis** [cite: 29] | Generación de reportes de movimientos, análisis simple de stock y exportación (S3). |
| **Angel** | [cite_start]**Transferencias entre Sucursales** [cite: 27] | Lógica de negocio para mover stock (Solicitud -> Aprobación -> Envío -> Recepción) con transacciones. |
| **Angel** | [cite_start]**Registro de Entradas/Salidas** [cite: 28] | Módulo de registro de movimientos (Compras/Ventas/Mermas) y auditoría de cambios. |

---

## 🚀 Instalación y Configuración Local

### Prerrequisitos
* Node.js v18+
* PostgreSQL 14+
* Redis (Opcional para dev, recomendado)

### Pasos
1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/usuario/microinvent.git](https://github.com/usuario/microinvent.git)
    cd microinvent
    ```

2.  **Instalar dependencias (Monorepo root):**
    ```bash
    npm install
    ```

3.  **Variables de Entorno:**
    Configurar el archivo `.env` en `/server` y `/client` basándose en `.env.example`.

4.  **Iniciar en modo desarrollo:**
    ```bash
    npm run dev
    ```

## 🏗 Arquitectura de Base de Datos (Preliminar)
[cite_start]El esquema utiliza un diseño optimizado para transacciones concurrentes con triggers para auditoría[cite: 17, 18].

* `users` (Roles, Credenciales)
* `products` (Catálogo global)
* `branches` (Sucursales físicas)
* `inventory` (Tabla pivote product-branch con cantidad y **version**)
* `movements` (Histórico inmutable)
* `transfers` (Máquina de estados para envíos)

---
*Proyecto desarrollado para la materia de Ingeniería de Software / Taller de Base de Datos.*