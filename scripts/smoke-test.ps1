param([string]$BaseUrl = 'http://127.0.0.1:8000')
$ErrorActionPreference = 'Stop'
$taskVehicle = Invoke-RestMethod -Uri "$BaseUrl/api/vehicles/GZS88X"
if ($taskVehicle.licensePlate -ne 'GZS88X' -or $taskVehicle.make -ne 'VOLKSWAGEN') {
    throw 'Live RDW vehicle identification failed.'
}
if ($taskVehicle.source.name -ne 'RDW Open Data' -or -not $taskVehicle.source.fetchedAt) {
    throw 'Source provenance is missing.'
}
$taskPayload = @{ annualKm = 12000; consumption = 6; energyPrice = 2; insuranceMonthly = 60; maintenanceMonthly = 40; roadTaxMonthly = 50 } | ConvertTo-Json
$taskCosts = Invoke-RestMethod -Uri "$BaseUrl/api/costs" -Method Post -ContentType 'application/json' -Body $taskPayload
if ($taskCosts.monthly -ne 270 -or $taskCosts.annual -ne 3240) {
    throw 'Live cost calculation failed.'
}
Write-Output 'Live RDW lookup, source metadata and cost API passed.'
