# Austa Care Platform - Database Setup

## 🏥 Overview

This directory contains the complete database schema and configuration for the Austa Care Platform, a HIPAA-compliant healthcare platform with WhatsApp integration.

## 📁 Directory Structure

```
prisma/
├── schema.prisma                    # Main Prisma schema
├── migrations/                      # Database migration files
│   └── 001_init_austa_care_schema.sql
├── seed/                           # Development seed data
│   └── development.ts
├── DATABASE_SCHEMA_DOCUMENTATION.md # Comprehensive schema docs
└── README.md                       # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure your database URL
DATABASE_URL="postgresql://username:password@localhost:5432/austa_care_platform"
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 4. Verify Setup

```bash
# Open Prisma Studio to explore data
npm run db:studio
```

## 📊 Schema Highlights

### Core Models
- **Organizations**: Healthcare institutions (hospitals, clinics)
- **Users**: Patients/beneficiaries with encrypted health data
- **Providers**: Healthcare professionals
- **Conversations**: WhatsApp chat sessions with AI context
- **Messages**: Individual WhatsApp messages with AI processing
- **HealthData**: Encrypted medical information
- **Missions**: Gamification system for patient engagement
- **Authorizations**: Medical procedure approvals
- **Documents**: Medical documents with OCR
- **AuditLogs**: Complete compliance tracking

### Key Features
- 🔐 **HIPAA Compliance**: End-to-end encryption, audit trails
- 🏥 **Multi-Tenant**: Organization-based data isolation
- 💬 **WhatsApp Integration**: Business API support
- 🤖 **AI Processing**: Health data extraction and intent detection
- 🎮 **Gamification**: Points, badges, and missions
- 🔗 **ERP Integration**: Tasy system synchronization
- 📄 **Document OCR**: Automated health data extraction

## 🛠️ Development Commands

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create and run migration
npm run db:migrate

# Deploy migrations (production)
npm run db:deploy

# Reset database and reseed
npm run db:reset

# Open database browser
npm run db:studio
```

### Data Management
```bash
# Seed development data
npm run db:seed

# Create database backup
npm run db:backup

# Validate schema and relationships
npm run validate
```

## 🔐 Security Configuration

### Encryption
- CPF (Brazilian tax ID) encryption at application level
- Health data encrypted in JSONB fields
- Emergency contact information encrypted
- API keys and credentials encrypted

### Access Control
- Role-based permissions (Patient, Provider, Admin, System)
- Organization-scoped data access
- Audit logging for all data access
- Row-level security (PostgreSQL RLS)

### Compliance
- HIPAA audit trails
- LGPD (Brazilian privacy law) compliance
- 7-year data retention policies
- Secure deletion procedures

## 📈 Performance Optimization

### Indexes
Strategic indexes for high-performance queries:
- User lookups by phone (WhatsApp integration)
- Organization-scoped queries
- Conversation and message retrieval
- Health data by user and type
- Audit log compliance queries

### Query Patterns
Optimized for healthcare-specific read patterns:
- Patient data retrieval
- Conversation history
- Health data aggregation
- Compliance reporting

## 🧪 Testing Data

The seed file creates:
- 2 Organizations (Hospital and Clinic)
- 3 Healthcare Providers
- 3 Test Patients
- 4 Health Data Entries
- 3 Gamification Missions
- 2 WhatsApp Conversations
- Sample messages, documents, and audit logs

### Test Credentials
```
Patients:
- Carlos Mendes: +5511987654321 (Hospital)
- Ana Costa: +5511876543210 (Hospital)  
- Pedro Lima: +5511765432109 (Clinic)

Organizations:
- Hospital São Paulo (HOSPITAL)
- Clínica Vida Saudável (CLINIC)
```

## 🔄 Migration Strategy

### Development
1. Make schema changes in `schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Test migration with seed data
4. Commit migration files

### Production
1. Backup database before deployment
2. Run `npm run db:deploy` for production migrations
3. Verify data integrity
4. Monitor performance impact

## 📋 Common Operations

### Adding New Health Data Types
1. Update `HealthDataType` enum in schema
2. Create migration: `npm run db:migrate`
3. Update seed data if needed
4. Add to API validation schemas

### Adding New Message Types
1. Update `MessageType` enum
2. Update AI processing logic
3. Test with WhatsApp webhook
4. Deploy with proper migration

### Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;

-- Monitor index usage
SELECT indexrelname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes;
```

## 🆘 Troubleshooting

### Common Issues

**Migration Failures**
```bash
# Reset migrations (development only)
npm run db:reset

# Check migration status
npx prisma migrate status
```

**Connection Issues**
```bash
# Test database connection
npx prisma db pull

# Verify environment variables
echo $DATABASE_URL
```

**Seed Data Issues**
```bash
# Clear and reseed
npm run db:reset

# Manual seeding
npx tsx prisma/seed/development.ts
```

### Performance Issues
1. Check database connection pool settings
2. Verify index usage with `EXPLAIN ANALYZE`
3. Monitor memory usage during operations
4. Consider query optimization

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## 🤝 Contributing

1. Follow the established schema patterns
2. Add appropriate indexes for new queries
3. Update documentation for schema changes
4. Include migration tests
5. Verify HIPAA compliance for health data

---

For detailed schema documentation, see [DATABASE_SCHEMA_DOCUMENTATION.md](./DATABASE_SCHEMA_DOCUMENTATION.md)