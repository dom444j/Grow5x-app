# Script para crear ZIPs de estructura del proyecto

Write-Host "Creando archivos ZIP de estructura del proyecto..."

# Eliminar ZIPs existentes
if (Test-Path "frontend-structure.zip") { Remove-Item "frontend-structure.zip" -Force }
if (Test-Path "backend-structure.zip") { Remove-Item "backend-structure.zip" -Force }

# Crear ZIP del frontend excluyendo dependencias
Write-Host "Procesando frontend..."
if (Test-Path "frontend") {
    $frontendFiles = Get-ChildItem -Path "frontend" -Recurse | Where-Object {
        $_.FullName -notlike "*node_modules*" -and
        $_.FullName -notlike "*dist*" -and
        $_.FullName -notlike "*build*" -and
        $_.FullName -notlike "*coverage*" -and
        $_.FullName -notlike "*test-results*" -and
        $_.Name -ne "package-lock.json" -and
        $_.Name -ne ".env" -and
        $_.Name -ne ".env.local" -and
        $_.Name -ne ".env.production" -and
        $_.Name -ne ".env.staging"
    }
    
    # Crear directorio temporal
    $tempFrontend = "temp-frontend"
    if (Test-Path $tempFrontend) { Remove-Item $tempFrontend -Recurse -Force }
    New-Item -ItemType Directory -Path $tempFrontend | Out-Null
    
    # Copiar archivos filtrados
    foreach ($file in $frontendFiles) {
        if (-not $file.PSIsContainer) {
            $relativePath = $file.FullName.Replace((Resolve-Path "frontend").Path + "\", "")
            $destPath = Join-Path $tempFrontend $relativePath
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item $file.FullName $destPath
        }
    }
    
    # Crear ZIP
    Compress-Archive -Path "$tempFrontend\*" -DestinationPath "frontend-structure.zip" -Force
    Remove-Item $tempFrontend -Recurse -Force
    Write-Host "✓ frontend-structure.zip creado"
}

# Crear ZIP del backend excluyendo dependencias
Write-Host "Procesando backend..."
if (Test-Path "backend") {
    $backendFiles = Get-ChildItem -Path "backend" -Recurse | Where-Object {
        $_.FullName -notlike "*node_modules*" -and
        $_.FullName -notlike "*logs*" -and
        $_.FullName -notlike "*uploads*" -and
        $_.FullName -notlike "*coverage*" -and
        $_.Name -ne "package-lock.json" -and
        $_.Name -ne ".env" -and
        $_.Name -ne ".env.local" -and
        $_.Name -ne ".env.production" -and
        $_.Name -ne ".env.staging" -and
        $_.Name -notlike "combined*.log" -and
        $_.Name -ne "error.log" -and
        $_.Name -ne "exceptions.log" -and
        $_.Name -ne "rejections.log"
    }
    
    # Crear directorio temporal
    $tempBackend = "temp-backend"
    if (Test-Path $tempBackend) { Remove-Item $tempBackend -Recurse -Force }
    New-Item -ItemType Directory -Path $tempBackend | Out-Null
    
    # Copiar archivos filtrados
    foreach ($file in $backendFiles) {
        if (-not $file.PSIsContainer) {
            $relativePath = $file.FullName.Replace((Resolve-Path "backend").Path + "\", "")
            $destPath = Join-Path $tempBackend $relativePath
            $destDir = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item $file.FullName $destPath
        }
    }
    
    # Crear ZIP
    Compress-Archive -Path "$tempBackend\*" -DestinationPath "backend-structure.zip" -Force
    Remove-Item $tempBackend -Recurse -Force
    Write-Host "✓ backend-structure.zip creado"
}

# Mostrar resumen
Write-Host "`n=== Resumen ==="
if (Test-Path "frontend-structure.zip") {
    $frontendSize = (Get-Item "frontend-structure.zip").Length / 1MB
    Write-Host "✓ frontend-structure.zip - {0:N2} MB" -f $frontendSize
}

if (Test-Path "backend-structure.zip") {
    $backendSize = (Get-Item "backend-structure.zip").Length / 1MB
    Write-Host "✓ backend-structure.zip - {0:N2} MB" -f $backendSize
}

Write-Host "`nArchivos ZIP listos para compartir con GPT-5!"