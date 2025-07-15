#\!/bin/bash

# Continuous monitoring script for TypeScript fixes

echo "Starting continuous TypeScript validation monitoring..."

# Function to check TypeScript errors
check_ts_errors() {
    echo "=== TypeScript Error Check at $(date) ==="
    npx tsc --noEmit --pretty 2>&1 | tee current-errors.log
    error_count=$(grep -c "error TS" current-errors.log || echo "0")
    echo "Total errors: $error_count"
    echo ""
}

# Function to check specific error types
check_error_types() {
    echo "=== Error Type Analysis ==="
    echo "TS6059 (rootDir): $(grep -c "TS6059" current-errors.log || echo "0")"
    echo "TS1259 (esModuleInterop): $(grep -c "TS1259" current-errors.log || echo "0")"
    echo "TS1192 (no default export): $(grep -c "TS1192" current-errors.log || echo "0")"
    echo "TS2307 (module not found): $(grep -c "TS2307" current-errors.log || echo "0")"
    echo ""
}

# Initial check
echo "=== INITIAL STATE ==="
check_ts_errors
check_error_types

# Store initial state
npx claude-flow@alpha hooks notify --message "Validation monitoring started" --level "info"

echo "Monitoring ready. Run this script after each phase to track progress."
