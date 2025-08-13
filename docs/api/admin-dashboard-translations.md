# Traducciones para el Panel de Administración de GrowX5

Este archivo contiene las traducciones faltantes para el panel de administración de GrowX5 en español e inglés, basadas en el análisis del código.

## Español

```json
{
  "admin": {
    "login": {
      "title": "Acceso de Administrador",
      "description": "Ingresa la contraseña de administrador para acceder a las funciones avanzadas.",
      "passwordPlaceholder": "Contraseña de administrador",
      "submit": "Acceder",
      "success": "Acceso de administrador concedido",
      "error": "Contraseña incorrecta",
      "tooManyAttempts": "Demasiados intentos fallidos. Inténtalo más tarde."
    },
    "dashboard": {
      "title": "Panel de Administración",
      "subtitle": "Gestión de preregistros y estadísticas",
      "status": {
        "admin": "Modo Administrador",
        "adminAccess": "Tienes acceso completo a las funciones de administración"
      },
      "exitAdminMode": "Salir del modo administrador",
      "stats": {
        "title": "Estadísticas de Preregistro",
        "totalPreregistrations": "Total de Preregistros",
        "convertedUsers": "Usuarios Convertidos",
        "pendingVerification": "Verificación Pendiente"
      },
      "recentPreregistrations": {
        "title": "Preregistros Recientes",
        "table": {
          "name": "Nombre",
          "email": "Email/Telegram",
          "date": "Fecha",
          "status": "Estado"
        },
        "viewAll": "Ver todos los preregistros"
      },
      "actions": {
        "title": "Acciones Administrativas",
        "exportData": "Exportar Datos",
        "exportDataDesc": "Descargar lista completa en formato CSV",
        "viewLogs": "Ver Registros",
        "viewLogsDesc": "Acceder a los registros del sistema"
      }
    }
  }
}
```

## Inglés

```json
{
  "admin": {
    "login": {
      "title": "Administrator Access",
      "description": "Enter the administrator password to access advanced functions.",
      "passwordPlaceholder": "Administrator password",
      "submit": "Access",
      "success": "Administrator access granted",
      "error": "Incorrect password",
      "tooManyAttempts": "Too many failed attempts. Please try again later."
    },
    "dashboard": {
      "title": "Administration Panel",
      "subtitle": "Preregistration management and statistics",
      "status": {
        "admin": "Administrator Mode",
        "adminAccess": "You have full access to administration functions"
      },
      "exitAdminMode": "Exit administrator mode",
      "stats": {
        "title": "Preregistration Statistics",
        "totalPreregistrations": "Total Preregistrations",
        "convertedUsers": "Converted Users",
        "pendingVerification": "Pending Verification"
      },
      "recentPreregistrations": {
        "title": "Recent Preregistrations",
        "table": {
          "name": "Name",
          "email": "Email/Telegram",
          "date": "Date",
          "status": "Status"
        },
        "viewAll": "View all preregistrations"
      },
      "actions": {
        "title": "Administrative Actions",
        "exportData": "Export Data",
        "exportDataDesc": "Download complete list in CSV format",
        "viewLogs": "View Logs",
        "viewLogsDesc": "Access system logs"
      }
    }
  }
}
```

## Instrucciones de Implementación

Para implementar estas traducciones en el proyecto GrowX5:

1. Abre el archivo `frontend/src/i18n.js`
2. Localiza las secciones de traducción para español e inglés
3. Agrega el objeto `admin` con todas sus propiedades en cada sección
4. Guarda el archivo y reinicia el servidor de desarrollo

Estas traducciones cubren todas las cadenas utilizadas en el componente `PreregistrationDashboard.jsx` para la funcionalidad de administración.