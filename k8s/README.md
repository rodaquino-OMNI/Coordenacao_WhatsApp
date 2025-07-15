# AUSTA Care Platform - Kubernetes Manifests

Production-ready Kubernetes manifests for the AUSTA Care healthcare coordination platform.

## Directory Structure

```
k8s/
├── base/                    # Base configurations
│   ├── namespace/          # Namespace and resource quotas
│   ├── backend/            # Backend API deployments
│   ├── frontend/           # Frontend PWA deployments
│   ├── whatsapp/           # WhatsApp webhook service
│   ├── ml/                 # ML inference services
│   ├── database/           # Database and cache configurations
│   ├── ingress/            # Ingress controllers
│   ├── istio/              # Service mesh configurations
│   ├── monitoring/         # Prometheus monitoring
│   ├── rbac/               # RBAC policies
│   ├── security/           # Security policies
│   └── kustomization.yaml  # Base kustomization
└── overlays/               # Environment-specific configurations
    ├── dev/                # Development environment
    ├── staging/            # Staging environment
    └── prod/               # Production environment
```

## Features

### High Availability
- Multi-replica deployments with pod anti-affinity
- Pod Disruption Budgets (PDB) for critical services
- Health checks (liveness, readiness, startup probes)
- Circuit breakers and retry policies via Istio

### Auto-scaling
- Horizontal Pod Autoscaler (HPA) based on CPU, memory, and custom metrics
- Vertical Pod Autoscaler (VPA) for right-sizing
- Cluster Autoscaler for node scaling
- Predictive scaling for ML workloads

### Security
- Pod Security Policies (PSP)
- Network Policies for micro-segmentation
- mTLS between services via Istio
- RBAC with least privilege principle
- Secrets management via External Secrets Operator
- Read-only root filesystems
- Non-root containers

### Observability
- Prometheus metrics collection
- Custom alerts and dashboards
- Distributed tracing via Jaeger
- Structured JSON logging
- Service mesh observability

### Service Mesh (Istio)
- Traffic management and load balancing
- Circuit breaking and retry policies
- mTLS for service-to-service communication
- JWT authentication
- Rate limiting and quotas

## Deployment

### Prerequisites
- Kubernetes 1.21+
- kubectl and kustomize
- Istio 1.12+
- cert-manager for TLS certificates
- External Secrets Operator for AWS Secrets Manager integration
- Prometheus Operator for monitoring

### Quick Start

1. **Install prerequisites:**
```bash
# Install Istio
istioctl install --set profile=production

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml

# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Install Prometheus Operator
kubectl create namespace monitoring
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install kube-prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

2. **Deploy to development:**
```bash
kubectl apply -k k8s/overlays/dev
```

3. **Deploy to production:**
```bash
kubectl apply -k k8s/overlays/prod
```

### Environment-Specific Configuration

Each environment overlay provides:
- Custom replica counts
- Environment-specific resource limits
- Unique configuration values
- Specific image tags
- Custom ingress rules

### Secrets Management

Secrets are managed via External Secrets Operator, syncing from AWS Secrets Manager:

1. Create secrets in AWS Secrets Manager:
```bash
aws secretsmanager create-secret --name /austa/production/database/postgres \
  --secret-string '{"connectionString":"postgresql://..."}'
```

2. The External Secrets Operator automatically syncs them to Kubernetes

### Monitoring

Access Prometheus and Grafana:
```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

Default Grafana credentials: admin/prom-operator

### ML Model Management

ML models are stored in S3 and downloaded via init containers:
- Models are cached in ephemeral volumes
- GPU nodes are automatically selected via node affinity
- Model serving uses gRPC for low latency

### WhatsApp Integration

The WhatsApp webhook service:
- Handles webhook verification
- Processes incoming messages
- Maintains high availability with multiple replicas
- Uses Redis for session management

### Database Connectivity

- External RDS PostgreSQL via ExternalName service
- Connection pooling at application level
- SSL/TLS encryption enforced
- Read replicas for scaling (configured in app)

### Backup and Disaster Recovery

Production includes:
- Automated database backups to S3
- Persistent volume snapshots
- Cross-region replication for critical data
- Disaster recovery runbooks

## Troubleshooting

### Common Issues

1. **Pods not starting:**
```bash
kubectl describe pod <pod-name> -n austa-care
kubectl logs <pod-name> -n austa-care
```

2. **Service mesh issues:**
```bash
istioctl analyze -n austa-care
istioctl proxy-config all <pod-name> -n austa-care
```

3. **Autoscaling issues:**
```bash
kubectl describe hpa -n austa-care
kubectl top pods -n austa-care
```

### Health Checks

All services expose health endpoints:
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe
- `/health/startup` - Startup probe
- `/metrics` - Prometheus metrics

## Maintenance

### Rolling Updates
```bash
# Update image tag in kustomization.yaml
# Then apply:
kubectl apply -k k8s/overlays/prod

# Monitor rollout:
kubectl rollout status deployment/austa-backend-api -n austa-care
```

### Scaling
```bash
# Manual scaling
kubectl scale deployment austa-backend-api --replicas=10 -n austa-care

# Update HPA limits
kubectl edit hpa austa-backend-api-hpa -n austa-care
```

### Backup Operations
```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup postgres-backup-manual -n austa-care
```

## Security Considerations

- All containers run as non-root
- Network policies enforce zero-trust networking
- Secrets are never stored in Git
- Image scanning via ECR vulnerability scanning
- Regular security updates and patching

## Performance Optimization

- Resource requests/limits tuned based on load testing
- Horizontal scaling preferred over vertical
- Cache layers at multiple levels
- Connection pooling for databases
- CDN for static assets (configured separately)

## Cost Optimization

- Spot instances for non-critical workloads
- Scheduled scaling for predictable traffic
- Right-sized instances via VPA recommendations
- Efficient resource allocation
- Cluster autoscaler configured to minimize waste

## Contributing

1. Test changes in dev environment first
2. Use kustomize for environment-specific changes
3. Follow security best practices
4. Update documentation for significant changes
5. Create PR with testing evidence

## License

Copyright 2024 AUSTA Care Platform. All rights reserved.