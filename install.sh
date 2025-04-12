#!/bin/bash

# APM Installation Script
# This script installs APM (Aether Packet Manager) system-wide

# Ensure script is run with sudo
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./install.sh)"
  exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
  echo "npm is not installed. Please install Node.js and npm first."
  exit 1
fi

# Get real user (not root)
REAL_USER=$(logname || echo "${SUDO_USER}")
if [ -z "$REAL_USER" ]; then
  echo "Could not determine real user. Please use sudo to run this script."
  exit 1
fi

echo "Installing APM (Aether Packet Manager)..."

# Install APM globally using npm
if ! npm install -g .; then
  echo "Error: Failed to install APM. Please check the npm logs for more details."
  exit 1
fi

# Create and set permissions on the registry directory
REGISTRY_DIR="/home/${REAL_USER}/.aether/registry"
mkdir -p "$REGISTRY_DIR"
chown -R "${REAL_USER}:${REAL_USER}" "/home/${REAL_USER}/.aether"

echo "APM installed successfully!"
echo "You can now use the 'apm' command from anywhere."
echo "Registry directory: $REGISTRY_DIR"
