# Script de prueba para registro con referido
# Genera un email unico y prueba el registro con codigo de referido

$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "test+ref+$timestamp@demo.com"

$payload = @{
    fullName = "Usuario Test Referido"
    email = $testEmail
    password = "TestPassword123!"
    confirmPassword = "TestPassword123!"
    country = "PE"
    acceptedTerms = $true
    acceptedRisk = $true
    estimatedAmount = 1000
    currency = "USDT"
    referralCode = "PARENT001"
    language = "es"
} | ConvertTo-Json

Write-Host "Probando registro con referido..." -ForegroundColor Cyan
Write-Host "Email de prueba: $testEmail" -ForegroundColor Yellow
Write-Host "Codigo de referido: PARENT001" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "https://grow5x.app/api/auth/register" -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "Registro exitoso!" -ForegroundColor Green
    Write-Host "Respuesta:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
    
} catch {
    $statusCode = $null
    $errorBody = $null
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
    }
    
    if ($_.ErrorDetails) {
        $errorBody = $_.ErrorDetails.Message
    } else {
        $errorBody = $_.Exception.Message
    }
    
    Write-Host "Error en registro - Codigo: $statusCode" -ForegroundColor Red
    
    if ($statusCode -eq 409) {
        Write-Host "Error 409 (Conflict) detectado - analizando..." -ForegroundColor Yellow
        try {
            $errorData = $errorBody | ConvertFrom-Json
            Write-Host "Detalles del error:" -ForegroundColor Yellow
            $errorData | ConvertTo-Json -Depth 2
        } catch {
            Write-Host "Error body: $errorBody" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`nVerificando salud de la API..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "https://grow5x.app/api/health" -Method GET
    Write-Host "API Health OK" -ForegroundColor Green
} catch {
    Write-Host "API Health Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nVerificando KPIs publicos..." -ForegroundColor Cyan
try {
    $kpisResponse = Invoke-RestMethod -Uri "https://grow5x.app/api/public/kpis" -Method GET
    Write-Host "KPIs OK - Total usuarios: $($kpisResponse.data.totalUsers)" -ForegroundColor Green
} catch {
    Write-Host "KPIs Error: $($_.Exception.Message)" -ForegroundColor Red
}