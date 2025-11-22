# Database Migrations

## Migration Tool

- **Tool**: Prisma Migrate
- **Location**: `backend/prisma/migrations/`
- **Schema File**: `backend/prisma/schema.prisma`

## Naming Conventions

Migrations are automatically named with timestamp and description:
- Format: `YYYYMMDDHHMMSS_description_name`
- Example: `20251116100117_add_location_and_school_fields`
- Example: `20251116133730_username`
- Example: `20251118110703_init`

## Workflow

### How to Create a Migration

1. **Modify Schema**: Edit `prisma/schema.prisma`
2. **Create Migration**: Run migration command
   ```bash
   pnpm prisma migrate dev --name your_migration_name
   ```
3. **Review Migration**: Check generated SQL in `prisma/migrations/YYYYMMDDHHMMSS_your_migration_name/migration.sql`
4. **Apply Migration**: Migration is automatically applied in development
5. **Commit**: Commit both schema.prisma and migration files

### How to Apply Migrations Locally

**Development**:
```bash
# Create and apply migration
pnpm prisma migrate dev

# Apply pending migrations only
pnpm prisma migrate deploy
```

**Reset Database** (⚠️ Deletes all data):
```bash
pnpm prisma migrate reset
```

### How Migrations are Applied in Production

**Production Deployment**:
```bash
# Generate Prisma Client
pnpm prisma generate

# Apply migrations (does not prompt)
pnpm prisma migrate deploy
```

**Best Practices**:
- Always test migrations in staging first
- Review migration SQL before applying
- Backup database before major migrations
- Apply migrations during maintenance windows for large changes

## Migration Rules

### Avoid Destructive Changes Without Backup

**⚠️ Never**:
- Drop columns without backup
- Drop tables without backup
- Change column types without data migration
- Remove indexes without understanding impact

**✅ Always**:
- Backup database before destructive migrations
- Test migrations on staging first
- Use `--create-only` flag to review SQL before applying
- Document breaking changes

### How to Handle Large Table Updates

**For Large Tables** (User, Payment, Notification):

1. **Add Column as Nullable First**:
   ```prisma
   model User {
     newField String?  // Nullable first
   }
   ```

2. **Backfill Data** (in application code or separate script):
   ```typescript
   // Backfill existing records
   await prisma.user.updateMany({
     data: { newField: defaultValue }
   });
   ```

3. **Make Column Required** (in next migration):
   ```prisma
   model User {
     newField String  // Now required
   }
   ```

**For Index Creation**:
- Use `CREATE INDEX CONCURRENTLY` in PostgreSQL (if supported)
- Or create index during low-traffic period

**For Column Type Changes**:
1. Add new column with new type
2. Migrate data from old to new column
3. Drop old column
4. Rename new column to old name

## Common Migration Scenarios

### Adding a New Column

```prisma
// schema.prisma
model User {
  newField String?
}
```

```bash
pnpm prisma migrate dev --name add_new_field
```

### Adding a Relationship

```prisma
model User {
  posts Post[]
}

model Post {
  authorId String
  author User @relation(fields: [authorId], references: [id])
}
```

```bash
pnpm prisma migrate dev --name add_user_posts_relation
```

### Adding an Index

```prisma
model User {
  email String @unique
  // Unique automatically creates index
}
```

Or manually:
```sql
-- In migration SQL
CREATE INDEX idx_user_email ON "User"(email);
```

### Changing Column Type

**Step 1**: Add new column
```prisma
model User {
  oldField String
  newField Int?  // New column, nullable
}
```

**Step 2**: Migrate data (in application or migration)
```sql
UPDATE "User" SET "newField" = CAST("oldField" AS INTEGER);
```

**Step 3**: Make required and drop old
```prisma
model User {
  newField Int  // Required
  // oldField removed
}
```

## Migration History

Current migrations:
- `20251116100117_add_location_and_school_fields`: Added location and school fields to User
- `20251116133730_username`: Added username field to User
- `20251118110703_init`: Initial schema migration

## Rollback Strategy

**Prisma Migrate does not support automatic rollbacks**. To rollback:

1. **Create New Migration**: Create migration that reverses changes
2. **Manual Rollback**: Manually edit database and create new migration
3. **Reset Database**: `pnpm prisma migrate reset` (⚠️ deletes all data)

**Best Practice**: Always test migrations in development/staging first.

## Migration Best Practices

1. **Small, Focused Migrations**: One logical change per migration
2. **Descriptive Names**: Clear migration names
3. **Review SQL**: Always review generated SQL
4. **Test First**: Test in development before production
5. **Backup**: Backup before destructive changes
6. **Document**: Document breaking changes
7. **Coordinate**: Coordinate with team for schema changes
8. **Version Control**: Always commit schema.prisma and migrations together

## Troubleshooting

### Migration Conflicts

If team members have conflicting migrations:
1. Pull latest migrations
2. Reset local database: `pnpm prisma migrate reset`
3. Apply all migrations: `pnpm prisma migrate deploy`

### Migration Failed

If migration fails:
1. Check error message
2. Fix schema or migration SQL
3. Create new migration to fix issue
4. Or manually fix database and create migration

### Schema Drift

If schema.prisma doesn't match database:
1. Introspect database: `pnpm prisma db pull`
2. Review differences
3. Create migration to sync: `pnpm prisma migrate dev --name sync_schema`

