# Austa Care Platform - Database Schema Documentation

## 🏥 Overview

This document describes the comprehensive database schema for the Austa Care Platform, a HIPAA-compliant healthcare platform with WhatsApp integration, gamification, and AI-powered health assistance.

## 🏗️ Architecture Principles

### HIPAA Compliance
- **Encryption at Rest**: Sensitive health data is encrypted at the application level
- **Audit Trail**: Complete audit logging for all data access and modifications
- **Access Controls**: Role-based access with multi-level permissions
- **Data Retention**: Configurable retention policies (default 7 years)
- **Soft Deletes**: Records are marked as deleted rather than physically removed

### Performance Optimization
- **Indexed Queries**: Strategic indexes for high-performance read operations
- **Connection Pooling**: Optimized database connection management
- **Query Optimization**: Designed for read-heavy healthcare operations
- **Partitioning Ready**: Schema supports future table partitioning

### Multi-Tenancy
- **Organization-based**: All data is scoped to organizations
- **Secure Isolation**: Complete data separation between organizations
- **Scalable Design**: Supports multiple healthcare providers

## 📊 Core Entity Models

### Organization Management

#### Organizations
**Table**: `organizations`
**Purpose**: Healthcare institutions (hospitals, clinics, labs)

**Key Features**:
- CNPJ-based unique identification for Brazilian healthcare facilities
- HIPAA compliance tracking
- Configurable data retention policies
- Structured address storage (JSONB)
- Organization-specific settings and configurations

**Important Fields**:
- `taxId`: Brazilian CNPJ (unique)
- `hipaaCompliant`: Compliance status flag
- `dataRetentionYears`: Configurable retention period
- `settings`: Organization-specific configurations (WhatsApp Business ID, features, etc.)

#### Users (Patients/Beneficiaries)
**Table**: `users`
**Purpose**: Healthcare beneficiaries with encrypted sensitive data

**Key Features**:
- CPF encryption for Brazilian tax ID compliance
- WhatsApp integration with Business API
- Emergency contact information (encrypted)
- Multi-language support
- Timezone-aware timestamps

**Important Fields**:
- `phone`: Primary identifier for WhatsApp integration (unique)
- `whatsappId`: WhatsApp Business API user ID
- `cpf`: Brazilian tax ID (encrypted at application level)
- `emergencyContact`: Encrypted emergency contact information
- `organizationId`: Multi-tenant organization reference

#### Providers
**Table**: `providers`
**Purpose**: Healthcare professionals (doctors, nurses, staff)

**Key Features**:
- Professional license tracking (CRM, COREN)
- Multi-specialty support
- Role-based access control
- Organization-scoped permissions

## 💬 WhatsApp Communication

### Conversations
**Table**: `conversations`
**Purpose**: WhatsApp chat sessions with AI context

**Key Features**:
- WhatsApp Business API integration
- AI conversation context storage
- Health topic categorization
- Performance metrics (response time, satisfaction)
- Priority-based conversation management

**AI Integration**:
- `aiContext`: Stores conversation context for AI continuity
- `healthTopics`: Automatically categorized health discussions
- `medicationsMentioned`: Medication tracking from conversations
- `symptomsReported`: Symptom extraction from messages

### Messages
**Table**: `messages`
**Purpose**: Individual WhatsApp messages with AI processing

**Key Features**:
- WhatsApp message ID tracking
- Media support (images, documents, audio)
- AI-powered intent detection
- Health keyword extraction
- Urgency level assessment

**AI Processing**:
- `aiProcessed`: Processing status flag
- `aiConfidence`: AI understanding confidence (0-1)
- `aiIntent`: Detected user intent
- `aiEntities`: Extracted health entities (medications, symptoms)
- `healthKeywords`: Detected health-related terms

## 🏥 Health Data Management

### Health Data
**Table**: `health_data`
**Purpose**: Encrypted medical information with access controls

**Key Features**:
- End-to-end encryption for sensitive data
- Multi-level access controls
- Data source tracking and reliability scoring
- Provider verification system
- Expiration dates for temporary data

**Data Categories**:
- **Conditions**: Medical diagnoses with ICD-10 codes
- **Medications**: Current prescriptions with dosages
- **Allergies**: Known allergies with severity levels
- **Symptoms**: Patient-reported symptoms
- **Vital Signs**: Blood pressure, weight, etc.
- **Lab Results**: Laboratory test results

**Security Features**:
- `sensitivityLevel`: PUBLIC → CONFIDENTIAL classification
- `accessLevel`: Fine-grained access control
- `verifiedBy`: Provider verification tracking
- Encrypted JSONB fields for medical data

## 🎮 Gamification System

### Missions
**Table**: `missions`
**Purpose**: Gamified onboarding and engagement tasks

**Key Features**:
- Difficulty-based point rewards
- Prerequisite mission chains
- Time-bound missions
- Badge and achievement rewards
- Customizable actions and requirements

### Health Points
**Table**: `health_points`
**Purpose**: User points, levels, and achievements

**Key Features**:
- Multi-category point system (onboarding, engagement, health)
- Level progression with experience points
- Badge collection system
- Streak tracking (daily, weekly, longest)
- Achievement storage

### Onboarding Progress
**Table**: `onboarding_progress`
**Purpose**: User progress tracking through missions

**Key Features**:
- Step-by-step progress tracking
- Time spent monitoring
- Attempt counting for analytics
- Completion rewards tracking

### Point Transactions
**Table**: `point_transactions`
**Purpose**: Audit trail for all point changes

**Key Features**:
- Complete transaction history
- Source tracking (mission, engagement, purchase)
- Metadata for analytics
- Support for negative transactions (spending, penalties)

## 📋 Authorization System

### Authorizations
**Table**: `authorizations`
**Purpose**: Medical procedure authorization requests

**Key Features**:
- Multi-step approval workflow
- Priority and urgency classification
- Clinical documentation support
- Tasy ERP integration
- Insurance claim linking

**Workflow**:
1. **Requested**: Provider submits authorization
2. **Under Review**: Clinical review process
3. **Approved/Denied**: Final decision
4. **Expired**: Time-based expiration

## 📄 Document Management

### Documents
**Table**: `documents`
**Purpose**: Medical documents with OCR and AI extraction

**Key Features**:
- Multi-provider storage support (Local, AWS S3, GCP)
- OCR text extraction with confidence scoring
- AI-powered health data extraction
- Encryption for sensitive documents
- HIPAA-compliant retention policies

**OCR & AI**:
- `ocrText`: Extracted text content
- `ocrConfidence`: OCR accuracy score
- `extractedData`: Structured health data from documents
- `healthKeywords`: AI-detected health terms

## 🔗 Tasy ERP Integration

### Tasy Integration
**Table**: `tasy_integrations`
**Purpose**: ERP system integration configuration

**Key Features**:
- Multi-instance support
- Configurable sync intervals
- Field mapping configuration
- Error tracking and recovery
- Performance monitoring

### Tasy Sync Logs
**Table**: `tasy_sync_logs`
**Purpose**: Detailed sync operation tracking

**Key Features**:
- Record-level sync tracking
- Error logging and analysis
- Performance metrics
- Data transformation logs

## 🔍 Audit & Compliance

### Audit Logs
**Table**: `audit_logs`
**Purpose**: Complete system activity tracking

**Key Features**:
- HIPAA and LGPD compliance logging
- Risk level assessment
- Sensitive data access tracking
- IP address and user agent logging
- Cross-entity relationship tracking

**Compliance**:
- `hipaaRelevant`: HIPAA-related activities
- `lgpdRelevant`: Brazilian privacy law compliance
- `sensitiveData`: Sensitive data access flag
- `requiresReview`: Manual review requirement

## 🗂️ Database Indexes

### Performance Indexes

#### High-Frequency Queries
```sql
-- User lookups by phone (WhatsApp integration)
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- Organization-scoped active users
CREATE INDEX "users_organizationId_isActive_idx" ON "users"("organizationId", "isActive");

-- Conversation message retrieval
CREATE INDEX "messages_conversationId_sentAt_idx" ON "messages"("conversationId", "sentAt");

-- Health data by user and type
CREATE INDEX "health_data_userId_type_isActive_idx" ON "health_data"("userId", "type", "isActive");
```

#### Security & Compliance
```sql
-- Audit log queries
CREATE INDEX "audit_logs_organizationId_occurredAt_idx" ON "audit_logs"("organizationId", "occurredAt");

-- HIPAA compliance queries
CREATE INDEX "audit_logs_hipaaRelevant_lgpdRelevant_idx" ON "audit_logs"("hipaaRelevant", "lgpdRelevant");
```

#### Gamification Performance
```sql
-- Mission progress tracking
CREATE INDEX "onboarding_progress_userId_status_idx" ON "onboarding_progress"("userId", "status");

-- Point transaction history
CREATE INDEX "point_transactions_userId_createdAt_idx" ON "point_transactions"("userId", "createdAt");
```

## 🔐 Security Implementation

### Encryption Strategy

#### Application-Level Encryption
- **CPF**: Brazilian tax ID encryption
- **Health Data**: Medical information encryption
- **Emergency Contacts**: Contact information encryption
- **API Keys**: Tasy integration credentials encryption

#### Database-Level Security
- **Row-Level Security**: PostgreSQL RLS for multi-tenancy
- **Connection Encryption**: TLS for all database connections
- **Backup Encryption**: Encrypted backup storage

### Access Control Matrix

| Role | Users | Health Data | Conversations | Audit Logs |
|------|-------|-------------|---------------|------------|
| Patient | Own data | Own data | Own conversations | No access |
| Provider | Org patients | Patient data | Patient conversations | Limited |
| Admin | Org users | Org data | Org conversations | Full access |
| System | All data | All data | All data | Full access |

## 🚀 Performance Considerations

### Query Optimization

#### Read-Heavy Patterns
- Optimized for healthcare data retrieval
- Conversation history queries
- Health data aggregation
- Audit trail searches

#### Write Optimization
- Bulk message insertion
- Batch health data updates
- Efficient audit logging
- Point transaction processing

### Scaling Strategies

#### Horizontal Scaling
- Organization-based sharding ready
- Conversation partitioning by date
- Message archival strategies

#### Vertical Scaling
- Connection pooling optimization
- Query result caching
- Materialized views for analytics

## 📈 Analytics & Reporting

### Health Analytics
- Patient engagement metrics
- Medication adherence tracking
- Symptom trend analysis
- Provider response times

### Platform Analytics
- WhatsApp message volume
- AI processing performance
- Gamification engagement
- System utilization metrics

### Compliance Reporting
- HIPAA audit reports
- Data access logs
- Retention compliance
- Security incident tracking

## 🔄 Data Lifecycle Management

### Retention Policies
- **Health Data**: 7+ years (configurable)
- **Conversations**: 3+ years
- **Audit Logs**: 10+ years
- **Documents**: 7+ years

### Archival Strategy
- Automated data archival
- Compressed storage
- Encrypted archives
- Recovery procedures

### Backup & Recovery
- Daily incremental backups
- Weekly full backups
- Point-in-time recovery
- Cross-region replication

## 🧪 Testing & Validation

### Data Integrity
- Foreign key constraints
- Check constraints for enums
- Custom validation rules
- Trigger-based auditing

### Performance Testing
- Load testing with realistic data volumes
- Query performance benchmarking
- Connection pool stress testing
- Memory usage optimization

## 📋 Migration Strategy

### Version Control
- Prisma migration files
- Rollback procedures
- Schema versioning
- Production deployment scripts

### Data Migration
- Backward compatibility
- Data transformation scripts
- Validation procedures
- Rollback capabilities

---

## 🚀 Getting Started

### Local Development Setup

1. **Database Setup**:
   ```bash
   # Create PostgreSQL database
   createdb austa_care_platform
   
   # Run migrations
   npm run db:migrate
   
   # Seed development data
   npm run db:seed
   ```

2. **Environment Configuration**:
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure database URL
   DATABASE_URL="postgresql://username:password@localhost:5432/austa_care_platform"
   ```

3. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

### Production Deployment

1. **Database Migration**:
   ```bash
   npm run db:deploy
   ```

2. **Security Configuration**:
   - Enable SSL connections
   - Configure row-level security
   - Set up backup encryption
   - Enable audit logging

3. **Performance Optimization**:
   - Configure connection pooling
   - Set up query caching
   - Monitor performance metrics
   - Optimize indexes

---

This schema provides a robust foundation for the Austa Care Platform, ensuring HIPAA compliance, optimal performance, and seamless integration with WhatsApp Business API and Tasy ERP systems.