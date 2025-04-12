# APM (Aether Packet Manager)

A command-line package manager for the Aether Framework ecosystem, written in TypeScript.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-v18.0.0%2B-green)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.0.0%2B-blue)

## Overview

APM allows developers to manage Aether Framework packages with a simple, npm-like command-line interface. The tool provides functionality for initializing, installing, publishing, and listing packages within the Aether ecosystem.

## Features

- **Initialize Aether packages**: Create a new Aether package structure
- **Install packages**: Install packages from a local registry or from GitHub
- **Publish packages**: Publish packages to a local registry
- **List packages**: View installed packages or packages available in the registry
- **Help system**: Get detailed help for commands and their options

## Installation

### Global Installation (recommended)

To install APM globally, making it available as a command-line tool anywhere on your system:

```bash
# Install globally using npm
npm install -g aether-packet-manager

# Or using sudo if you need higher permissions
sudo npm install -g aether-packet-manager
```

### Local Installation

```bash
# Install as a dev dependency in your project
npm install --save-dev aether-packet-manager

# Or use with npx
npx aether-packet-manager [command]
```

### Build from Source

```bash
# Clone the repository
git clone https://github.com/your-username/apm.git
cd apm

# Install dependencies
npm install

# Build
npm run build

# Link for local development
npm link
```

## Commands

### Initialize a new package

```bash
apm init [options]
```

Options:
- `-y, --yes` - Skip prompts and use default values

### Install packages

```bash
apm install [package] [options]
```

The package argument can be:
- A package name registered in the local registry
- A GitHub repository in the format `user/repo`
- A full GitHub URL: `https://github.com/user/repo`

Options:
- `-D, --dev` - Install as a development dependency
- `-g, --global` - Install globally

### Publish a package

```bash
apm publish [options]
```

Options:
- `--dry-run` - Show what would be published without actually publishing

### List packages

```bash
apm list [options]
```

Options:
- `-a, --all` - Show all available packages in the registry
- `-j, --json` - Output as JSON

### Help

```bash
apm help [command]
```

## Project Structure

APM expects and creates the following project structure:

```
your-package/
├── aether.json            # Aether project configuration
├── package.aether.json    # Package metadata for publishing
├── aether_modules/        # Installed dependencies
│   └── ...
└── src/                   # Source code
    └── index.js           # Entry point
```

### aether.json

The main configuration file for an Aether project:

```json
{
  "name": "example-package",
  "version": "0.1.0",
  "description": "My Aether module",
  "dependencies": {
    "some-package": "1.0.0"
  }
}
```

### package.aether.json

The package metadata used when publishing:

```json
{
  "name": "example-package",
  "version": "0.1.0",
  "description": "My Aether module",
  "author": "Your Name",
  "repository": "https://github.com/user/repo",
  "main": "src/index.js",
  "dependencies": {
    "some-package": "1.0.0"
  }
}
```

## Permissions and Sudo Usage

When installing APM globally with sudo, the tool will:

1. Be available system-wide as a command-line utility
2. Store the registry in the current user's home directory (`~/.aether`)
3. Automatically set appropriate file permissions for executable files

Note that sudo is only needed for the installation process, not for running the commands.

## License

MIT

---

Created for the Aether Framework ecosystem.
