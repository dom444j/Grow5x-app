# Script para probar la API de actualización de perfil con curl
# Necesitas obtener un token JWT válido primero

# Configuración
$API_URL = "http://localhost:3000/api"
$TOKEN = "TU_TOKEN_AQUI"  # Reemplazar con un token real

# Datos de prueba
$profileData = @{
    fullName = "Test Usuario Curl"
    country = "Colombia"
    telegram = "test_curl_user"
    preferences = @{
        notifications = @{
            email = $true
            telegram = $true
            marketing = $false
        }
    }
} | ConvertTo-Json -Depth 3

Write-Host "🔄 Probando actualización de perfil con PowerShell..." -ForegroundColor Yellow
Write-Host "📤 Datos a enviar:" -ForegroundColor Cyan
Write-Host $profileData -ForegroundColor White

# Hacer la petición PUT
try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $TOKEN"
    }
    
    Write-Host "\n🌐 Enviando petición PUT a $API_URL/auth/profile..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri "$API_URL/auth/profile" -Method PUT -Headers $headers -Body $profileData -ErrorAction Stop
    
    Write-Host "✅ Respuesta exitosa:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor White
    
} catch {
    Write-Host "❌ Error en la petición:" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host "\n💡 NOTA: Necesitas reemplazar TU_TOKEN_AQUI con un token JWT válido" -ForegroundColor Yellow
Write-Host "💡 Puedes obtener el token desde las DevTools del navegador en la aplicación" -ForegroundColor Yellow
Write-Host "💡 Ve a Application > Local Storage > token o desde Network > Headers > Authorization" -ForegroundColor Yellow