# AUSTA Care Platform - Infrastructure as Code

This directory contains Terraform configurations for deploying the AUSTA Care Platform infrastructure on AWS.

## Architecture Overview

The infrastructure includes:

- **Networking**: Multi-AZ VPC with public, private, and database subnets
- **Compute**: EKS cluster with auto-scaling node groups (on-demand and spot)
- **Database**: RDS PostgreSQL (Multi-AZ), ElastiCache Redis, and DocumentDB
- **Storage**: S3 buckets for assets, uploads, backups, and logs; EFS for shared storage
- **Security**: WAF, Security Groups, IAM roles, KMS encryption, GuardDuty, and Security Hub
- **Monitoring**: CloudWatch dashboards, alarms, and Synthetics canaries
- **CDN/DNS**: CloudFront distribution and Route 53 hosted zone

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.5.0
3. kubectl (for EKS cluster access)
4. An S3 bucket for Terraform state (update backend configuration)

## Directory Structure

```
infrastructure/terraform/
├── modules/                    # Reusable Terraform modules
│   ├── networking/            # VPC, subnets, NAT gateways
│   ├── compute/              # EKS cluster and node groups
│   ├── database/             # RDS, ElastiCache, DocumentDB
│   ├── storage/              # S3 buckets and EFS
│   ├── security/             # IAM, WAF, security groups
│   ├── monitoring/           # CloudWatch, alarms, dashboards
│   └── cdn-dns/              # CloudFront and Route 53
├── environments/              # Environment-specific configurations
│   └── production/           # Production environment
└── README.md                 # This file
```

## Deployment Steps

### 1. Initialize Backend

First, create the S3 bucket and DynamoDB table for Terraform state:

```bash
aws s3api create-bucket \
  --bucket austacare-terraform-state \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

aws s3api put-bucket-versioning \
  --bucket austacare-terraform-state \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket austacare-terraform-state \
  --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

aws dynamodb create-table \
  --table-name austacare-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-west-2
```

### 2. Configure Variables

```bash
cd environments/production
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your specific values
```

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Plan Deployment

```bash
terraform plan -out=tfplan
```

### 5. Apply Configuration

```bash
terraform apply tfplan
```

### 6. Configure kubectl

After deployment, configure kubectl to access the EKS cluster:

```bash
aws eks update-kubeconfig \
  --region us-west-2 \
  --name austacare-eks
```

## Module Details

### Networking Module

- Creates a VPC with CIDR 10.0.0.0/16
- 3 availability zones with public, private, and database subnets
- NAT gateways for private subnet internet access
- VPC endpoints for S3, ECR, and other AWS services
- Flow logs enabled for security monitoring

### Compute Module

- EKS cluster with Kubernetes 1.28
- Two node groups: on-demand (general workloads) and spot (cost-optimized)
- Auto-scaling configured with Cluster Autoscaler
- AWS Load Balancer Controller for ingress
- EBS CSI driver for persistent volumes

### Database Module

- RDS PostgreSQL 14.9 with Multi-AZ deployment
- Read replica for read scaling
- ElastiCache Redis cluster (3 nodes)
- DocumentDB cluster for MongoDB-compatible workloads
- Automated backups with 30-day retention
- Performance Insights enabled

### Storage Module

- S3 buckets with encryption and lifecycle policies
- EFS for shared persistent storage
- Backup vault with AWS Backup
- CloudWatch logs integration

### Security Module

- WAF with managed rule sets and rate limiting
- IAM roles with least privilege access
- KMS keys for encryption at rest
- Security Hub for compliance monitoring
- GuardDuty for threat detection
- Network ACLs and security groups

### Monitoring Module

- CloudWatch dashboards for infrastructure overview
- Alarms for CPU, memory, disk, and application metrics
- SNS topics for alert notifications
- Synthetics canaries for endpoint monitoring
- Log metric filters for error tracking

### CDN/DNS Module

- CloudFront distribution with custom origin
- Route 53 hosted zone with health checks
- ACM certificates for SSL/TLS
- Origin Access Identity for S3 access

## Cost Optimization

The infrastructure includes several cost optimization features:

1. **Spot Instances**: Node group with spot instances for non-critical workloads
2. **S3 Lifecycle Policies**: Automatic transition to cheaper storage classes
3. **EFS Lifecycle**: Automatic transition to Infrequent Access storage
4. **Reserved Capacity**: Consider purchasing Reserved Instances for production workloads

## Security Best Practices

1. **Encryption**: All data encrypted at rest and in transit
2. **Network Isolation**: Private subnets for application workloads
3. **IAM Roles**: Service accounts with minimal required permissions
4. **Monitoring**: Comprehensive logging and alerting
5. **Compliance**: Security Hub with CIS, PCI-DSS, and AWS best practices

## Maintenance

### Updating Infrastructure

```bash
# Update modules
terraform get -update

# Plan changes
terraform plan

# Apply changes
terraform apply
```

### Scaling Node Groups

```bash
# Update node group desired capacity in terraform.tfvars
# Then apply changes
terraform apply -target=module.compute.aws_eks_node_group.main
```

### Backup and Recovery

- RDS automated backups run daily at 03:00 UTC
- EBS volumes backed up via AWS Backup
- S3 buckets have versioning enabled
- DocumentDB snapshots retained for 30 days

## Troubleshooting

### Common Issues

1. **EKS Node Registration**: Ensure security groups allow node-to-cluster communication
2. **ALB Target Health**: Check application health endpoint returns 200 OK
3. **Database Connections**: Verify security group rules and subnet routing
4. **CloudFront 502 Errors**: Check ALB health and origin timeout settings

### Useful Commands

```bash
# Check EKS cluster status
aws eks describe-cluster --name austacare-eks

# View RDS instance details
aws rds describe-db-instances --db-instance-identifier austacare-db

# List S3 buckets
aws s3 ls | grep austacare

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix austacare
```

## Destroying Infrastructure

**WARNING**: This will delete all resources and data!

```bash
terraform destroy
```

## Support

For issues or questions:
- Check CloudWatch logs and alarms
- Review Security Hub findings
- Contact the DevOps team at devops@austacare.com