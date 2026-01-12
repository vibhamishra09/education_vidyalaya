docker run --rm -i -e OLD="$env:OLD" postgres:17 bash -c 'pg_dump --format=custom --no-owner --no-acl "$OLD" > /tmp/neon.dump && cat /tmp/neon.dump' > neon.dump 

docker run --rm -i -e NEW="$NEW" -v ${PWD}:/data postgres:17 bash -c 'pg_restore --clean --no-owner --no-acl -d "$NEW"' < neon.dump