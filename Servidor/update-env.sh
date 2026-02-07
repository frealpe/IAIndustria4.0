#!/bin/bash
# Script para actualizar .env de ServidorPc con la configuración centralizada de IP

ENV_FILE=".env"
ENV_BACKUP=".env.backup"

echo "🔧 Actualizando configuración de .env en ServidorPc..."

# Crear backup
cp "$ENV_FILE" "$ENV_BACKUP"
echo "✅ Backup creado en $ENV_BACKUP"

# Tu IP actual
SERVER_IP="10.96.170.180"

# Agregar SERVER_IP si no existe
if ! grep -q "^SERVER_IP=" "$ENV_FILE"; then
    # Insertar después de PORT
    sed -i "/^PORT=/a\\
\\
# 🌐 IP CENTRALIZADA\\
SERVER_IP=$SERVER_IP" "$ENV_FILE"
    echo "✅ Agregada variable SERVER_IP"
fi

# Actualizar BROKER para usar interpolación
if grep -q "^BROKER=" "$ENV_FILE"; then
    sed -i "s|^BROKER=.*|BROKER=mqtt://\${SERVER_IP}:1883|" "$ENV_FILE"
    echo "✅ Actualizada variable BROKER"
fi

echo ""
echo "🎉 ¡Configuración actualizada!"
echo "📋 Ahora solo necesitas cambiar SERVER_IP cuando tu IP cambie"
echo "🔄 Reinicia el servidor para aplicar los cambios: npm run start"
