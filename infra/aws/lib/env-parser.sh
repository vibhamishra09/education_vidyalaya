#!/bin/bash
# Environment variable parser for task definitions

# Parse environment variables from file
# Supports JSON format: [{"name":"VAR","value":"val"},...] or {"VAR":"val",...}
# Or key-value format: VAR=value (one per line)
parse_env_file() {
    local env_file="$1"
    local env_json=""
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file" >&2
        return 1
    fi
    
    if [ ! -r "$env_file" ]; then
        log_error "Environment file is not readable: $env_file" >&2
        return 1
    fi
    
    # Check if file looks like JSON (starts with { or [)
    FIRST_CHAR=$(head -c 1 "$env_file" | tr -d '\n')
    IS_JSON=false

    echo "First character: $FIRST_CHAR"
    if [ "$FIRST_CHAR" = "{" ] || [ "$FIRST_CHAR" = "[" ]; then
        IS_JSON=true
        echo "File looks like JSON"
    fi
    
    # Try to parse as JSON format if it looks like JSON
    if [ "$IS_JSON" = true ] && command -v jq &> /dev/null; then
        # Try to parse as JSON array format: [{"name":"VAR","value":"val"},...]
        if jq -e '. | type == "array"' "$env_file" &> /dev/null; then
            # Already in ECS format
            env_json=$(jq -c '.' "$env_file")
            log "Parsed environment variables from JSON array format"
        # Try to parse as JSON object format: {"VAR":"val",...}
        elif jq -e '. | type == "object"' "$env_file" &> /dev/null; then
            # Convert object to array format
            env_json=$(jq -c '[to_entries[] | {name: .key, value: .value}]' "$env_file")
            log "Parsed environment variables from JSON object format"
        else
            IS_JSON=false
        fi
    fi
    
    # If not JSON or JSON parsing failed, try key-value format (.env style)
    if [ -z "$env_json" ] || [ "$IS_JSON" = false ]; then
        log "Parsing environment variables from key-value format (.env style)..."
        env_json="["
        FIRST=true
        VAR_COUNT=0
        
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
            
            # Remove leading/trailing whitespace
            line=$(echo "$line" | xargs)
            
            # Check if line contains = (key-value pair)
            if [[ "$line" =~ ^[^=]+= ]]; then
                # Split on first = only (values can contain =)
                key="${line%%=*}"
                value="${line#*=}"
                
                # Trim whitespace from key and value
                key=$(echo "$key" | xargs)
                value=$(echo "$value" | xargs)
                
                # Remove quotes from value if present (we'll add them back as JSON)
                value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
                
                if [ -n "$key" ]; then
                    if [ "$FIRST" = true ]; then
                        FIRST=false
                    else
                        env_json+=","
                    fi
                    
                    # Use jq to properly escape the value as JSON string
                    if command -v jq &> /dev/null; then
                        # Use jq to properly escape the value (jq -R reads raw input, -s adds quotes)
                        escaped_value=$(printf '%s' "$value" | jq -Rs .)
                        env_json+="{\"name\":\"$key\",\"value\":$escaped_value}"
                    else
                        # Fallback: manual escaping (less robust)
                        # Escape backslashes first, then quotes, then control characters
                        value=$(printf '%s' "$value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\x00/\\u0000/g' | sed 's/\x01/\\u0001/g')
                        # Always quote the value as a JSON string
                        env_json+="{\"name\":\"$key\",\"value\":\"$value\"}"
                    fi
                    VAR_COUNT=$((VAR_COUNT + 1))
                fi
            fi
        done < "$env_file"
        env_json+="]"
        
        if [ $VAR_COUNT -eq 0 ]; then
            log_warning "No environment variables found in key-value format"
        else
            log "Parsed $VAR_COUNT environment variables from key-value format"
        fi
    fi
    
    if [ -z "$env_json" ] || [ "$env_json" = "[]" ]; then
        log_warning "No environment variables parsed from file"
        return 1
    fi
    
    echo "$env_json"
    return 0
}

