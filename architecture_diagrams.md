# 🎨 System Architecture Diagrams: AUSTA Care Platform

**Version:** 1.0  
**Date:** July 14, 2025  
**Purpose:** Visual representations of system architecture components

---

## 📊 High-Level System Overview

```mermaid
C4Context
    title System Context Diagram - AUSTA Care Platform

    Person(patient, "Patient/Beneficiary", "Healthcare plan member using WhatsApp")
    Person(nurse, "Care Coordinator", "Healthcare professional managing care")
    Person(admin, "Platform Admin", "System administrator")

    System(austa, "AUSTA Care Platform", "AI-powered healthcare coordination platform")

    System_Ext(whatsapp, "WhatsApp Business API", "Primary communication channel")
    System_Ext(tasy, "ERP Tasy", "Healthcare management system")
    System_Ext(openai, "OpenAI GPT-4", "AI language model")
    System_Ext(fhir, "FHIR Gateway", "Healthcare interoperability")

    Rel(patient, whatsapp, "Sends messages")
    Rel(whatsapp, austa, "Message events")
    Rel(nurse, austa, "Manages care coordination")
    Rel(admin, austa, "System administration")
    
    Rel(austa, tasy, "Patient data, authorizations")
    Rel(austa, openai, "AI processing requests")
    Rel(austa, fhir, "Healthcare data exchange")
```

## 🏗️ Container Architecture

```mermaid
C4Container
    title Container Diagram - AUSTA Care Platform

    Container(gateway, "API Gateway", "Kong", "Request routing, authentication, rate limiting")
    
    Container(chat, "Chat Service", "Node.js", "WhatsApp message handling")
    Container(ai, "AI/NLP Service", "Python/FastAPI", "Symptom analysis, NLP processing")
    Container(auth, "Authorization Service", "Java/Spring", "Healthcare authorization processing")
    Container(user, "User Service", "Node.js", "User management, profiles")
    Container(risk, "Risk Engine", "Python", "Health risk assessment")
    Container(notification, "Notification Service", "Node.js", "Multi-channel notifications")
    Container(integration, "Integration Hub", "Java", "External system integrations")

    ContainerDb(postgres, "PostgreSQL", "Relational DB", "Transactional data")
    ContainerDb(mongo, "MongoDB", "Document DB", "Conversations, documents")
    ContainerDb(redis, "Redis Cluster", "Cache", "Sessions, real-time data")
    ContainerDb(datalake, "Data Lake", "Delta Lake", "Analytics, ML data")

    Container(kafka, "Apache Kafka", "Event Streaming", "Event backbone")

    Rel(gateway, chat, "Routes messages")
    Rel(gateway, ai, "AI requests")
    Rel(gateway, auth, "Authorization requests")
    Rel(gateway, user, "User operations")

    Rel(chat, kafka, "Message events")
    Rel(ai, kafka, "Analysis events")
    Rel(auth, kafka, "Auth events")
    Rel(risk, kafka, "Risk events")

    Rel(chat, mongo, "Store conversations")
    Rel(user, postgres, "User data")
    Rel(auth, postgres, "Authorization data")
    Rel(risk, datalake, "Analytics data")

    Rel_Back(redis, chat, "Session cache")
    Rel_Back(redis, ai, "Model cache")
```

## 🔄 Data Flow Architecture

```mermaid
graph TB
    subgraph "Data Sources"
        A[WhatsApp Messages]
        B[User Interactions]
        C[ERP Tasy Data]
        D[External APIs]
    end

    subgraph "Event Streaming Layer"
        E[Apache Kafka]
        F[Event Sourcing]
        G[Real-time Streams]
    end

    subgraph "Processing Layer"
        H[Stream Processing]
        I[Batch Processing]
        J[AI/ML Pipeline]
    end

    subgraph "Storage Layer"
        K[Operational DB]
        L[Document Store]
        M[Cache Layer]
        N[Data Lake]
    end

    subgraph "Analytics & ML"
        O[Feature Store]
        P[Model Training]
        Q[Real-time Inference]
        R[Business Intelligence]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> H
    E --> I
    E --> J

    H --> K
    H --> L
    H --> M
    I --> N
    J --> O

    N --> P
    O --> Q
    P --> Q
    Q --> R

    style E fill:#e1f5fe
    style J fill:#f3e5f5
    style N fill:#e8f5e8
```

## 🤖 AI/ML Pipeline Architecture

```mermaid
graph LR
    subgraph "Data Ingestion"
        A[User Messages]
        B[Medical Records]
        C[System Events]
        D[External Data]
    end

    subgraph "Feature Engineering"
        E[Data Validation]
        F[Feature Extraction]
        G[Feature Store]
    end

    subgraph "Model Development"
        H[Experiment Tracking]
        I[Model Training]
        J[Model Validation]
        K[Model Registry]
    end

    subgraph "Model Deployment"
        L[Model Serving]
        M[A/B Testing]
        N[Monitoring]
        O[Feedback Loop]
    end

    A --> E
    B --> E
    C --> E
    D --> E

    E --> F
    F --> G

    G --> H
    H --> I
    I --> J
    J --> K

    K --> L
    L --> M
    M --> N
    N --> O
    O --> F

    style G fill:#fff3e0
    style K fill:#e8f5e8
    style N fill:#fce4ec
```

## 🔐 Security Architecture

```mermaid
graph TB
    subgraph "Perimeter Defense"
        A[WAF/DDoS Protection]
        B[Network Firewall]
        C[VPN Access]
    end

    subgraph "Identity & Access"
        D[OAuth 2.0/OIDC]
        E[Multi-Factor Auth]
        F[RBAC/ABAC]
        G[PAM]
    end

    subgraph "Application Security"
        H[API Gateway Security]
        I[Input Validation]
        J[OWASP Controls]
        K[Secret Management]
    end

    subgraph "Data Protection"
        L[Encryption at Rest]
        M[Encryption in Transit]
        N[Key Management]
        O[DLP Controls]
    end

    subgraph "Runtime Security"
        P[Container Security]
        Q[Runtime Monitoring]
        R[SIEM/SOC]
        S[Incident Response]
    end

    A --> D
    B --> D
    C --> D

    D --> H
    E --> H
    F --> H
    G --> H

    H --> L
    I --> L
    J --> L
    K --> L

    L --> P
    M --> P
    N --> P
    O --> P

    P --> R
    Q --> R
    R --> S

    style D fill:#e3f2fd
    style L fill:#f1f8e9
    style R fill:#fff3e0
```

## 📡 Integration Architecture

```mermaid
graph TB
    subgraph "AUSTA Platform"
        A[Integration Hub]
        B[Message Queue]
        C[Data Transformation]
        D[API Gateway]
    end

    subgraph "Healthcare Systems"
        E[ERP Tasy]
        F[FHIR Gateway]
        G[Lab Systems]
        H[Hospital EMRs]
    end

    subgraph "Communication Platforms"
        I[WhatsApp Business]
        J[SMS Gateway]
        K[Email Service]
        L[Push Notifications]
    end

    subgraph "AI/ML Services"
        M[OpenAI GPT-4]
        N[AWS Comprehend Medical]
        O[Custom ML Models]
        P[OCR Services]
    end

    subgraph "External APIs"
        Q[Payment Gateways]
        R[Government APIs]
        S[Insurance Networks]
        T[Pharmacy Systems]
    end

    A --> B
    B --> C
    C --> D

    D --> E
    D --> F
    D --> G
    D --> H

    D --> I
    D --> J
    D --> K
    D --> L

    D --> M
    D --> N
    D --> O
    D --> P

    D --> Q
    D --> R
    D --> S
    D --> T

    style A fill:#e1f5fe
    style D fill:#f3e5f5
```

## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Multi-Cloud Strategy"
        subgraph "AWS Primary Region"
            A[EKS Cluster]
            B[RDS PostgreSQL]
            C[DocumentDB]
            D[ElastiCache]
            E[S3 Data Lake]
        end

        subgraph "GCP DR Region"
            F[GKE Cluster]
            G[Cloud SQL]
            H[Firestore]
            I[Memorystore]
            J[Cloud Storage]
        end
    end

    subgraph "Edge/CDN"
        K[CloudFront]
        L[Global Load Balancer]
    end

    subgraph "Monitoring & Ops"
        M[Prometheus]
        N[Grafana]
        O[Jaeger]
        P[ELK Stack]
    end

    K --> L
    L --> A
    L --> F

    A --> B
    A --> C
    A --> D
    A --> E

    F --> G
    F --> H
    F --> I
    F --> J

    A --> M
    F --> M
    M --> N
    M --> O
    M --> P

    style A fill:#ff9800
    style F fill:#4caf50
    style K fill:#2196f3
```

## 🔄 Event-Driven Architecture

```mermaid
sequenceDiagram
    participant U as User (WhatsApp)
    participant G as API Gateway
    participant C as Chat Service
    participant K as Kafka
    participant A as AI Service
    participant Auth as Auth Service
    participant N as Notification Service
    participant T as Tasy ERP

    U->>G: Send symptom message
    G->>C: Route message
    C->>K: Publish MessageReceived event
    C->>U: Acknowledge receipt

    K->>A: Consume MessageReceived
    A->>A: Analyze symptoms
    A->>K: Publish SymptomAnalyzed event

    K->>Auth: Consume SymptomAnalyzed
    Auth->>T: Check eligibility
    T-->>Auth: Return eligibility
    Auth->>K: Publish AuthorizationNeeded event

    K->>N: Consume AuthorizationNeeded
    N->>U: Send authorization request
    
    U->>G: Submit documents
    G->>Auth: Process authorization
    Auth->>K: Publish AuthorizationApproved event
    
    K->>N: Consume AuthorizationApproved
    N->>U: Send approval notification
```

## 📊 Monitoring & Observability

```mermaid
graph TB
    subgraph "Data Collection"
        A[Application Metrics]
        B[Infrastructure Metrics]
        C[Business Metrics]
        D[Log Data]
        E[Trace Data]
    end

    subgraph "Storage & Processing"
        F[Prometheus]
        G[Elasticsearch]
        H[Jaeger]
        I[InfluxDB]
    end

    subgraph "Visualization"
        J[Grafana Dashboards]
        K[Kibana]
        L[Business Intelligence]
    end

    subgraph "Alerting"
        M[AlertManager]
        N[PagerDuty]
        O[Slack/Teams]
    end

    A --> F
    B --> F
    C --> I
    D --> G
    E --> H

    F --> J
    G --> K
    I --> L

    F --> M
    M --> N
    M --> O

    style F fill:#ff5722
    style J fill:#4caf50
    style M fill:#f44336
```

---

## 🎯 Diagram Usage Guidelines

### For Development Teams
- Use **Container Diagram** for understanding service boundaries
- Reference **Data Flow** for event handling patterns
- Follow **Security Architecture** for implementation standards

### For Operations Teams
- Monitor using **Monitoring Architecture** components
- Deploy following **Deployment Architecture** patterns
- Integrate systems per **Integration Architecture**

### For Business Stakeholders
- Understand capabilities via **System Overview**
- Track value delivery through **AI/ML Pipeline**
- Assess security posture via **Security Architecture**

### For Compliance Teams
- Validate data flows for LGPD/HIPAA compliance
- Review security controls implementation
- Audit integration patterns for regulatory requirements

---

**Document Maintained By:** System Architecture Agent  
**Last Updated:** July 14, 2025  
**Related Documents:** SYSTEM_ARCHITECTURE_DESIGN.md