# MicroInvent: Sistema de Inventario Distribuido & PWA

![Status](https://img.shields.io/badge/Status-In%20Development-yellow) ![Version](https://img.shields.io/badge/Version-1.0.0-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## 📖 Descripción del Proyecto
MicroInvent es una Aplicación Web Progresiva (PWA) diseñada para gestionar inventarios en tiempo real para negocios con múltiples sucursales. El sistema resuelve problemas de inconsistencia de stock mediante una arquitectura **Offline-First**, sincronización automática y manejo de concurrencia distribuida.

El proyecto está diseñado para ser desplegado en **AWS** utilizando servicios gestionados para garantizar escalabilidad y alta disponibilidad.

## 🛠 Stack Tecnológico

La arquitectura ha sido seleccionada para cumplir con los requisitos de alto rendimiento, funcionamiento sin conexión y actualizaciones en tiempo real.

### Frontend (PWA Offline-First)
* **Core:** React.js + Vite.
* **Estado & Sync:** TanStack Query (Gestión de estado asíncrono y caché).
* **Base de Datos Local:** Dexie.js (Wrapper para IndexedDB) para almacenamiento offline.
* **Estilos:** TailwindCSS (para diseño responsive rápido).
* **Tiempo Real:** Socket.io Client.

### Backend (API RESTful & Microservicios Lógicos)
* **Runtime:** Node.js.
* **Framework:** Express.js.
* **Validación:** Joi/Zod.
* **Seguridad:** JWT para autenticación y Bcrypt para hashing.

### Base de Datos & Caché
* **Relacional:** PostgreSQL (Motor principal transaccional).
* **Caché:** Redis (Para sesiones y consultas frecuentes de catálogo).
* **Control de Concurrencia:** Optimistic Locking (campo `version` en tablas críticas).

### Infraestructura Cloud (AWS)
* **Frontend Hosting:** AWS Amplify.
* **Backend Hosting:** AWS Elastic Beanstalk (Load Balancer + Auto-scaling).
* **Database:** Amazon RDS (PostgreSQL).
* **Storage:** Amazon S3 (Almacenamiento de reportes/imágenes).

---

## 👥 Asignación de Módulos y Responsabilidades

El desarrollo se divide por dominios funcionales para mantener la independencia del código y facilitar la colaboración.

| Desarrollador | Módulo / Funcionalidad | Descripción Técnica |
| :--- | :--- | :--- |
| **Jorge** | **Autenticación y Autorización** | Implementación de JWT, Middleware de protección de rutas, Roles (Admin/Sucursal). |
| **Jorge** | **Inventario por Sucursal** | CRUD de productos, visualización de stock en tiempo real, manejo de alertas de stock bajo. |
| **Jorge** | **Reportes y Análisis** | Generación de reportes de movimientos, análisis simple de stock y exportación (S3). |
| **Angel** | **Transferencias entre Sucursales** | Lógica de negocio para mover stock (Solicitud -> Aprobación -> Envío -> Recepción) con transacciones. |
| **Angel** | **Registro de Entradas/Salidas** | Módulo de registro de movimientos (Compras/Ventas/Mermas) y auditoría de cambios. |

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
El esquema utiliza un diseño optimizado para transacciones concurrentes con triggers para auditoría.

* `users` (Roles, Credenciales)
* `products` (Catálogo global)
* `branches` (Sucursales físicas)
* `inventory` (Tabla pivote product-branch con cantidad y **version**)
* `movements` (Histórico inmutable)
* `transfers` (Máquina de estados para envíos)

---
*Proyecto desarrollado para la materia de Desarrollo y Despliegue de Aplicaciones en La Nube, Programacion Web para Clientes y Usabilidad, Desarrollo Backend con Frameworks Modernos, Gestion de Proyectos de Software*