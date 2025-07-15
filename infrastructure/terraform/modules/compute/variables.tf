variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "private_subnet_ids" {
  description = "IDs of private subnets for node groups"
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "IDs of public subnets for load balancers"
  type        = list(string)
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

variable "enable_public_access" {
  description = "Enable public API server endpoint"
  type        = bool
  default     = false
}

variable "public_access_cidrs" {
  description = "List of CIDR blocks that can access the public API server endpoint"
  type        = list(string)
  default     = []
}

variable "node_volume_size" {
  description = "EBS volume size for worker nodes in GB"
  type        = number
  default     = 100
}

variable "node_groups" {
  description = "Map of EKS node group configurations"
  type = map(object({
    desired_size   = number
    max_size       = number
    min_size       = number
    instance_types = list(string)
    capacity_type  = string
    labels         = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    tags = map(string)
  }))
  default = {
    general = {
      desired_size   = 3
      max_size       = 10
      min_size       = 1
      instance_types = ["m6i.large", "m6a.large"]
      capacity_type  = "ON_DEMAND"
      labels = {
        workload = "general"
      }
      taints = []
      tags   = {}
    }
    spot = {
      desired_size   = 2
      max_size       = 20
      min_size       = 0
      instance_types = ["m6i.large", "m6a.large", "m5.large", "m5a.large"]
      capacity_type  = "SPOT"
      labels = {
        workload = "spot"
      }
      taints = [{
        key    = "spot"
        value  = "true"
        effect = "NoSchedule"
      }]
      tags = {}
    }
  }
}

variable "addon_versions" {
  description = "Versions for EKS add-ons"
  type = object({
    vpc_cni        = string
    coredns        = string
    kube_proxy     = string
    ebs_csi_driver = string
  })
  default = {
    vpc_cni        = "v1.15.4-eksbuild.1"
    coredns        = "v1.10.1-eksbuild.6"
    kube_proxy     = "v1.28.4-eksbuild.1"
    ebs_csi_driver = "v1.25.0-eksbuild.1"
  }
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}