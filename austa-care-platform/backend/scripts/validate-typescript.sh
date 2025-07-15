#!/bin/bash

# TypeScript Validation Script
# Quality Guardian's comprehensive TypeScript validation tool

set -e

echo "🔍 TypeScript Validation Suite"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check command existence
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        return 1
    fi
    return 0
}

# Function to run a check and report results
run_check() {
    local name=$1
    local command=$2
    
    echo -e "\n${BLUE}Running: ${name}${NC}"
    if eval $command; then
        echo -e "${GREEN}✅ ${name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${name} failed${NC}"
        return 1
    fi
}

# Track overall success
VALIDATION_PASSED=true

# Check required tools
echo "Checking required tools..."
check_command "tsc" || { echo "Please install TypeScript: npm install -g typescript"; exit 1; }
check_command "node" || { echo "Please install Node.js"; exit 1; }

# 1. TypeScript Compilation Check
run_check "TypeScript Compilation" "tsc --noEmit" || VALIDATION_PASSED=false

# 2. Strict Mode Check
run_check "TypeScript Strict Mode" "tsc --noEmit --strict" || echo -e "${YELLOW}⚠️  Consider enabling strict mode${NC}"

# 3. Check for specific error types
echo -e "\n${BLUE}Analyzing TypeScript Errors${NC}"
if tsc --noEmit 2>&1 | grep -q "error TS"; then
    echo "Error distribution:"
    tsc --noEmit 2>&1 | grep "error TS" | sed -E 's/.*error (TS[0-9]+).*/\1/' | sort | uniq -c | sort -nr | head -10
else
    echo -e "${GREEN}✅ No TypeScript errors found${NC}"
fi

# 4. Type Coverage Check (if type-coverage is installed)
if command -v type-coverage &> /dev/null; then
    echo -e "\n${BLUE}Type Coverage Analysis${NC}"
    type-coverage --detail || true
fi

# 5. Module Resolution Check
echo -e "\n${BLUE}Module Resolution Check${NC}"
MISSING_MODULES=$(tsc --noEmit --listFiles 2>&1 | grep "Cannot find module" | sort | uniq | wc -l)
if [ $MISSING_MODULES -eq 0 ]; then
    echo -e "${GREEN}✅ All modules resolved successfully${NC}"
else
    echo -e "${RED}❌ Found $MISSING_MODULES missing modules${NC}"
    VALIDATION_PASSED=false
fi

# 6. Check tsconfig.json validity
echo -e "\n${BLUE}TSConfig Validation${NC}"
if tsc --showConfig > /dev/null 2>&1; then
    echo -e "${GREEN}✅ tsconfig.json is valid${NC}"
else
    echo -e "${RED}❌ tsconfig.json has errors${NC}"
    VALIDATION_PASSED=false
fi

# 7. Check for @types packages
echo -e "\n${BLUE}Type Definition Check${NC}"
REQUIRED_TYPES=("@types/node" "@types/jest" "@types/express")
MISSING_TYPES=()

for pkg in "${REQUIRED_TYPES[@]}"; do
    if ! grep -q "\"$pkg\"" package.json; then
        MISSING_TYPES+=($pkg)
    fi
done

if [ ${#MISSING_TYPES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required type definitions present${NC}"
else
    echo -e "${RED}❌ Missing type definitions: ${MISSING_TYPES[*]}${NC}"
    echo "Install with: npm install --save-dev ${MISSING_TYPES[*]}"
    VALIDATION_PASSED=false
fi

# 8. Incremental Build Test
echo -e "\n${BLUE}Incremental Build Test${NC}"
if tsc --incremental --noEmit; then
    echo -e "${GREEN}✅ Incremental build successful${NC}"
    # Clean up incremental build info
    rm -f tsconfig.tsbuildinfo
else
    echo -e "${RED}❌ Incremental build failed${NC}"
    VALIDATION_PASSED=false
fi

# 9. Declaration File Generation Test
echo -e "\n${BLUE}Declaration File Test${NC}"
if tsc --declaration --emitDeclarationOnly --outDir /tmp/ts-declarations 2>/dev/null; then
    echo -e "${GREEN}✅ Can generate declaration files${NC}"
    rm -rf /tmp/ts-declarations
else
    echo -e "${YELLOW}⚠️  Cannot generate declaration files${NC}"
fi

# Summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}================================${NC}"

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ All validation checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some validation checks failed${NC}"
    echo -e "${YELLOW}Please fix the errors above before proceeding${NC}"
    exit 1
fi