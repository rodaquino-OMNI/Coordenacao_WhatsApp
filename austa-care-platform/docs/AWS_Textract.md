AWS Textract + Amazon Comprehend Medical
Why It's Perfect for AUSTA:

Healthcare Optimized: Purpose-built for medical documents
Portuguese Support: Native Portuguese language processing
HIPAA Compliant: BAA available, healthcare-grade security
Pay-per-Use: No upfront costs, scale as you grow

Pricing:

Text Detection: $1.50 per 1,000 pages
Form/Table Extraction: $50 per 1,000 pages
Medical Entity Extraction: $7.50 per 10,000 units
Monthly estimate: ~$200-500 for 10,000 documents

Key Features:
yamlCapabilities:
  - Prescription reading (medications, dosages)
  - Lab results extraction (values, ranges)
  - Medical form processing
  - Handwriting recognition
  - Table/form structure detection
  
Integration:
  - REST API
  - SDK for Node.js/Python
  - Real-time and batch processing
  - S3 integration for document storage
Implementation Example:
javascript// AWS Textract Medical
const textract = new AWS.Textract();
const comprehendMedical = new AWS.ComprehendMedical();

// Extract text and medical entities
const response = await textract.analyzeDocument({
  Document: { S3Object: { Bucket: 'medical-docs', Name: 'prescription.jpg' }},
  FeatureTypes: ['FORMS', 'TABLES']
});

// Extract medical entities
const medicalEntities = await comprehendMedical.detectEntitiesV2({
  Text: extractedText
});
