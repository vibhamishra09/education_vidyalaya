Open GitBash and run the following commands (omit the ?sslmode=require&channel_binding=require etc from the URLs):

export OLD="postgresql://neondb_owner:npg_qSNMRJjpXI53@ep-shy-boat-adlfggug-pooler.c-2.us-east-1.aws.neon.tech/neondb"

export NEW="postgresql://neondb_owner:npg_hWQ2CDLROx6S@ep-square-frost-ahpe2sw8-pooler.c-3.us-east-1.aws.neon.tech/neondb"

docker run --rm -i -e OLD="$OLD" postgres:17 bash -c 'pg_dump --format=custom --no-owner --no-acl "$OLD" > /tmp/neon.dump && cat /tmp/neon.dump' > neon.dump 

docker run --rm -i -e NEW="$NEW" -v ${PWD}:/data postgres:17 bash -c 'pg_restore --clean --no-owner --no-acl -d "$NEW"' < neon.dump