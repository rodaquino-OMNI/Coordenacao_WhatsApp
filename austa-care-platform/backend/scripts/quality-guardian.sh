#!/bin/bash

# Quality Guardian - TypeScript Error Validation Script
# Monitors TypeScript fixes and ensures no regressions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASELINE_ERRORS=127
ERROR_LOG="typescript-errors.log"
VALIDATION_LOG="validation-results.log"
QUALITY_REPORT="quality-metrics.json"

echo -e "${BLUE}🛡️  Quality Guardian - TypeScript Validation${NC}"
echo "================================================"

# Function to count TypeScript errors
count_errors() {
    local count=$(npm run build 2>&1 | grep -c "error TS" || true)
    echo $count
}

# Function to check specific error types
check_error_category() {
    local category=$1
    local pattern=$2
    local count=$(grep "$pattern" $ERROR_LOG | wc -l | tr -d ' ')
    echo $count
}

# Function to run tests
run_test_suite() {
    local suite=$1
    echo -e "\n${YELLOW}Running $suite tests...${NC}"
    
    if npm run test:$suite > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $suite tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $suite tests failed${NC}"
        return 1
    fi
}

# Function to generate quality report
generate_quality_report() {
    local current_errors=$1
    local improvement=$((BASELINE_ERRORS - current_errors))
    local percentage=$((improvement * 100 / BASELINE_ERRORS))
    
    cat > $QUALITY_REPORT <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "baseline_errors": $BASELINE_ERRORS,
  "current_errors": $current_errors,
  "improvement": $improvement,
  "improvement_percentage": $percentage,
  "categories": {
    "unknown_errors": $(check_error_category "unknown" "'error' is of type 'unknown'"),
    "type_mismatches": $(check_error_category "mismatch" "is not assignable to type"),
    "missing_properties": $(check_error_category "missing" "Property .* does not exist"),
    "import_issues": $(check_error_category "import" "Cannot find module\\|has no exported member")
  },
  "quality_score": $(echo "scale=2; (100 - $current_errors) / 10" | bc),
  "regression_detected": false
}
EOF
}

# Main validation process
echo -e "\n${BLUE}📊 Running TypeScript Compilation...${NC}"
npm run build 2>&1 | tee $ERROR_LOG > /dev/null

CURRENT_ERRORS=$(grep -c "error TS" $ERROR_LOG || echo 0)

echo -e "\n${BLUE}📈 Error Analysis:${NC}"
echo "  Baseline Errors: $BASELINE_ERRORS"
echo "  Current Errors:  $CURRENT_ERRORS"
echo "  Improvement:     $((BASELINE_ERRORS - CURRENT_ERRORS))"

# Check for regression
if [ $CURRENT_ERRORS -gt $BASELINE_ERRORS ]; then
    echo -e "\n${RED}🚨 REGRESSION DETECTED!${NC}"
    echo "  New errors have been introduced!"
    
    # Find new errors
    echo -e "\n${RED}New Errors:${NC}"
    # This would require comparing with baseline log
    tail -20 $ERROR_LOG
    
    # Update quality report
    sed -i 's/"regression_detected": false/"regression_detected": true/g' $QUALITY_REPORT
    exit 1
fi

# Category breakdown
echo -e "\n${BLUE}🔍 Error Categories:${NC}"
echo "  Unknown Errors:     $(check_error_category "unknown" "'error' is of type 'unknown'")"
echo "  Type Mismatches:    $(check_error_category "mismatch" "is not assignable to type")"
echo "  Missing Properties: $(check_error_category "missing" "Property .* does not exist")"
echo "  Import Issues:      $(check_error_category "import" "Cannot find module\\|has no exported member")"

# Run test suites
echo -e "\n${BLUE}🧪 Running Test Suites...${NC}"
TEST_RESULTS=0

run_test_suite "unit" || TEST_RESULTS=$((TEST_RESULTS + 1))
run_test_suite "integration" || TEST_RESULTS=$((TEST_RESULTS + 1))

# Generate quality report
generate_quality_report $CURRENT_ERRORS

# Final summary
echo -e "\n${BLUE}📊 Quality Summary:${NC}"
if [ $CURRENT_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All TypeScript errors resolved!${NC}"
elif [ $CURRENT_ERRORS -lt $BASELINE_ERRORS ]; then
    echo -e "${GREEN}✅ Progress made: $((BASELINE_ERRORS - CURRENT_ERRORS)) errors fixed${NC}"
else
    echo -e "${YELLOW}⚠️  No improvement detected${NC}"
fi

if [ $TEST_RESULTS -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passing${NC}"
else
    echo -e "${RED}❌ $TEST_RESULTS test suite(s) failing${NC}"
fi

# Save validation results
cat > $VALIDATION_LOG <<EOF
Validation Run: $(date)
=====================================
Baseline Errors: $BASELINE_ERRORS
Current Errors: $CURRENT_ERRORS
Improvement: $((BASELINE_ERRORS - CURRENT_ERRORS))
Test Results: $TEST_RESULTS failures
Quality Score: $(echo "scale=2; (100 - $CURRENT_ERRORS) / 10" | bc)/10
=====================================
EOF

echo -e "\n${GREEN}✅ Validation complete. Results saved to:${NC}"
echo "  - Error Log: $ERROR_LOG"
echo "  - Quality Report: $QUALITY_REPORT"
echo "  - Validation Log: $VALIDATION_LOG"

exit $TEST_RESULTS