#!/bin/bash

# Real-time TypeScript Fix Monitor
# Tracks progress and validates fixes as they happen

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Clear screen and show header
clear
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           🛡️  Quality Guardian - Live Monitor 🛡️               ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"

# Configuration
BASELINE=127
WATCH_DIR="src"
CHECK_INTERVAL=5

# Function to get current error count
get_error_count() {
    npm run build 2>&1 | grep -c "error TS" || echo 0
}

# Function to get error categories
get_error_breakdown() {
    local log_file="temp-errors.log"
    npm run build 2>&1 > $log_file
    
    local unknown=$(grep -c "'error' is of type 'unknown'" $log_file || echo 0)
    local type_mismatch=$(grep -c "is not assignable to type" $log_file || echo 0)
    local missing=$(grep -c "Property .* does not exist" $log_file || echo 0)
    local imports=$(grep -c "Cannot find module\|has no exported member" $log_file || echo 0)
    
    rm -f $log_file
    echo "$unknown|$type_mismatch|$missing|$imports"
}

# Function to display progress bar
progress_bar() {
    local current=$1
    local total=$2
    local fixed=$((total - current))
    local percentage=$((fixed * 100 / total))
    local bar_length=40
    local filled=$((percentage * bar_length / 100))
    
    printf "\r["
    printf "%${filled}s" | tr ' ' '█'
    printf "%$((bar_length - filled))s" | tr ' ' '░'
    printf "] %3d%% (%d/%d fixed)" $percentage $fixed $total
}

# Main monitoring loop
LAST_COUNT=$BASELINE
LAST_CHECK=$(date +%s)

while true; do
    # Get current state
    CURRENT_COUNT=$(get_error_count)
    BREAKDOWN=$(get_error_breakdown)
    IFS='|' read -r UNKNOWN TYPE_MISMATCH MISSING IMPORTS <<< "$BREAKDOWN"
    
    # Clear and redraw
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           🛡️  Quality Guardian - Live Monitor 🛡️               ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo
    
    # Overall progress
    echo -e "${BLUE}📊 Overall Progress:${NC}"
    echo -n "   "
    progress_bar $CURRENT_COUNT $BASELINE
    echo
    echo
    
    # Status indicator
    if [ $CURRENT_COUNT -lt $LAST_COUNT ]; then
        echo -e "   ${GREEN}✅ Improvement detected! (-$((LAST_COUNT - CURRENT_COUNT)) errors)${NC}"
    elif [ $CURRENT_COUNT -gt $LAST_COUNT ]; then
        echo -e "   ${RED}🚨 Regression detected! (+$((CURRENT_COUNT - LAST_COUNT)) errors)${NC}"
    else
        echo -e "   ${YELLOW}⏸  No change since last check${NC}"
    fi
    echo
    
    # Error breakdown
    echo -e "${BLUE}🔍 Error Categories:${NC}"
    echo -e "   ${YELLOW}Unknown Errors:${NC}     $UNKNOWN"
    echo -e "   ${YELLOW}Type Mismatches:${NC}    $TYPE_MISMATCH"
    echo -e "   ${YELLOW}Missing Properties:${NC} $MISSING"
    echo -e "   ${YELLOW}Import Issues:${NC}      $IMPORTS"
    echo
    
    # Quality metrics
    QUALITY_SCORE=$(echo "scale=1; (100 - $CURRENT_COUNT * 100 / $BASELINE) / 10" | bc)
    echo -e "${BLUE}📈 Quality Metrics:${NC}"
    echo -e "   ${YELLOW}Quality Score:${NC}      $QUALITY_SCORE/10"
    echo -e "   ${YELLOW}Errors Fixed:${NC}       $((BASELINE - CURRENT_COUNT))/$BASELINE"
    echo -e "   ${YELLOW}Success Rate:${NC}       $((BASELINE - CURRENT_COUNT) * 100 / BASELINE))%"
    echo
    
    # Recent activity
    echo -e "${BLUE}🕐 Recent Activity:${NC}"
    MODIFIED_FILES=$(find $WATCH_DIR -name "*.ts" -newer /tmp/last_check 2>/dev/null | wc -l || echo 0)
    echo -e "   ${YELLOW}Files Modified:${NC}     $MODIFIED_FILES"
    echo -e "   ${YELLOW}Last Check:${NC}         $(date '+%H:%M:%S')"
    echo -e "   ${YELLOW}Next Check:${NC}         $(date -d "+$CHECK_INTERVAL seconds" '+%H:%M:%S')"
    echo
    
    # Recommendations
    echo -e "${BLUE}💡 Recommendations:${NC}"
    if [ $UNKNOWN -gt 10 ]; then
        echo -e "   ${YELLOW}•${NC} Focus on error handling - $UNKNOWN unknown errors remain"
    fi
    if [ $TYPE_MISMATCH -gt 20 ]; then
        echo -e "   ${YELLOW}•${NC} Review type definitions - $TYPE_MISMATCH type mismatches"
    fi
    if [ $IMPORTS -gt 5 ]; then
        echo -e "   ${YELLOW}•${NC} Check module exports - $IMPORTS import issues"
    fi
    
    # Update state
    LAST_COUNT=$CURRENT_COUNT
    touch /tmp/last_check
    
    # Exit conditions
    if [ $CURRENT_COUNT -eq 0 ]; then
        echo
        echo -e "${GREEN}🎉 All TypeScript errors resolved! 🎉${NC}"
        break
    fi
    
    # Wait for next check
    sleep $CHECK_INTERVAL
done

# Final report
echo
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Fix Process Complete!${NC}"
echo -e "   Total Errors Fixed: $BASELINE"
echo -e "   Final Quality Score: 10/10"
echo -e "   Time Elapsed: $(($(date +%s) - LAST_CHECK)) seconds"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"