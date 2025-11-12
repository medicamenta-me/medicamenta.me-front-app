#!/bin/bash

# 🚀 Script de Inicialização - Firebase Emulator
# Medicamenta.me API Local Testing

echo ""
echo "=== MEDICAMENTA.ME API - FIREBASE EMULATOR ==="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "firebase.json" ]; then
    echo -e "${YELLOW}⚠️  Erro: firebase.json não encontrado${NC}"
    echo "Execute este script do diretório raiz do projeto"
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "functions/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    cd functions
    npm install
    cd ..
fi

# Compilar TypeScript
echo -e "${YELLOW}🔨 Compilando TypeScript...${NC}"
cd functions
npm run build
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Erro na compilação TypeScript${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}✅ Compilação concluída${NC}"
echo ""

# Informações sobre o emulator
echo -e "${CYAN}📋 Informações do Emulator:${NC}"
echo ""
echo "  🌐 API Base URL:"
echo "     http://localhost:5001/medicamenta-me/us-central1/api"
echo ""
echo "  📚 Swagger UI:"
echo "     http://localhost:5001/medicamenta-me/us-central1/api/api-docs"
echo ""
echo "  🔍 Health Check:"
echo "     http://localhost:5001/medicamenta-me/us-central1/api/health"
echo ""
echo "  🎮 Emulator UI:"
echo "     http://localhost:4000"
echo ""

# Perguntar se deseja executar os testes automaticamente
echo -e "${YELLOW}Deseja executar os testes automaticamente após iniciar? (y/n)${NC}"
read -r run_tests

# Iniciar emulator
echo -e "${GREEN}🚀 Iniciando Firebase Emulator...${NC}"
echo ""
echo "Pressione Ctrl+C para parar o emulator"
echo ""

if [ "$run_tests" = "y" ] || [ "$run_tests" = "Y" ]; then
    # Iniciar emulator em background
    firebase emulators:start --only functions &
    EMULATOR_PID=$!
    
    # Aguardar emulator iniciar
    echo "Aguardando emulator iniciar..."
    sleep 10
    
    # Executar testes
    echo -e "${CYAN}🧪 Executando testes...${NC}"
    ./test-api-local.sh
    
    # Parar emulator
    kill $EMULATOR_PID
else
    # Iniciar emulator normalmente
    firebase emulators:start --only functions
fi
