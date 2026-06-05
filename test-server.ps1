$ProgressPreference = 'SilentlyContinue'
try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/' -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    Write-Host ("Status: " + $response.StatusCode + " Size: " + $response.RawContentLength + " bytes")
} catch {
    Write-Host ("Erro HTTP: " + $_.Exception.Message)
}
