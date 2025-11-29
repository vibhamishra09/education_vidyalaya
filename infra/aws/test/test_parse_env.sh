cd infra/aws

# Dummy log file so utils logging works
export SETUP_LOG=/tmp/parse-env-test.log

# Load logging + parser
source lib/utils.sh
source lib/env-parser.sh

# Point this to whatever file you want to test
TEST_ENV_FILE="../../backend/.env.test"

# Call the function
RESULT=$(parse_env_file "$TEST_ENV_FILE")

echo "----- RAW OUTPUT -----"
echo "$RESULT"

If jq is installed, pretty‑print / validate it
echo "----- jq . -----"
echo "$RESULT" | jq .