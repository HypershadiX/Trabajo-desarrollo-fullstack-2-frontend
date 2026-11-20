#!/usr/bin/env bash
# Compila el frontend y lo sube a la EC2 (Linux / macOS / Git Bash).
#
# Uso:  ./scripts/desplegar.sh ruta/clave.pem IP_O_DOMINIO [usuario] [carpeta-del-backend]
set -euo pipefail

CLAVE="${1:?Falta la ruta del archivo .pem}"
IP="${2:?Falta la IP o el dominio de la EC2}"
USUARIO="${3:-ec2-user}"
CARPETA="${4:-ferretech-backend}"

echo "1/3 Compilando..."
npm run build

echo "2/3 Limpiando la versión anterior en la EC2..."
# Se vacía el contenido pero NO la carpeta: Docker mantiene montada esa carpeta en Caddy.
ssh -i "$CLAVE" "$USUARIO@$IP" "mkdir -p $CARPETA/dist && rm -rf $CARPETA/dist/*"

echo "3/3 Subiendo archivos..."
scp -i "$CLAVE" -r dist "$USUARIO@$IP:$CARPETA/"

echo "Listo: abre http://$IP"
