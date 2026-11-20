<#
  Compila el frontend y lo sube a la EC2 (Windows / PowerShell).

  Ejemplo:
    .\scripts\desplegar.ps1 -Clave C:\Users\yo\claves\mi-clave.pem -Ip 3.90.10.20

  Copia la carpeta dist/ a "<Carpeta>/dist" en la EC2, que es la que Caddy sirve
  (ver compose.yaml del repo del backend). No hace falta reiniciar nada.
#>
param(
  [Parameter(Mandatory = $true)][string]$Clave,    # ruta del archivo .pem
  [Parameter(Mandatory = $true)][string]$Ip,       # IP pública o dominio de la EC2
  [string]$Usuario = 'ec2-user',                   # ubuntu en Ubuntu, ec2-user en Amazon Linux
  [string]$Carpeta = 'ferretech-backend'           # carpeta del repo del backend dentro de la EC2
)

$ErrorActionPreference = 'Stop'

Write-Host '1/3 Compilando...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación.' }

Write-Host '2/3 Limpiando la versión anterior en la EC2...' -ForegroundColor Cyan
# Se vacía el contenido pero NO la carpeta: Docker mantiene montada esa carpeta en Caddy.
ssh -i $Clave "${Usuario}@${Ip}" "mkdir -p $Carpeta/dist && rm -rf $Carpeta/dist/*"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar por SSH.' }

Write-Host '3/3 Subiendo archivos...' -ForegroundColor Cyan
scp -i $Clave -r dist "${Usuario}@${Ip}:${Carpeta}/"
if ($LASTEXITCODE -ne 0) { throw 'Falló la copia con scp.' }

Write-Host "Listo: abre http://$Ip" -ForegroundColor Green
