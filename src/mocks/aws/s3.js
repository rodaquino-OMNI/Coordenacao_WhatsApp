// AWS S3 Mock using local filesystem
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { simulateDelay, simulateError, generateId } = require('../utils/delay');

class S3Mock {
  constructor() {
    this.baseDir = config.localStorage.s3;
    this.buckets = new Map();
    this.objects = new Map();
    
    // Ensure storage directory exists
    this.ensureDirectory(this.baseDir);
    
    // Initialize default buckets
    this.initializeDefaultBuckets();
  }

  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  initializeDefaultBuckets() {
    const defaultBuckets = [
      'austa-documents',
      'austa-media',
      'austa-backups',
      'austa-temp'
    ];

    defaultBuckets.forEach(bucketName => {
      this.createBucket({ Bucket: bucketName });
    });
  }

  /**
   * Create bucket mock
   * @param {Object} params - S3 createBucket params
   * @returns {Promise<Object>} CreateBucket response
   */
  async createBucket(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to create bucket');

    const bucketName = params.Bucket;
    const bucketPath = path.join(this.baseDir, bucketName);

    if (this.buckets.has(bucketName)) {
      const error = new Error('BucketAlreadyExists');
      error.code = 'BucketAlreadyExists';
      throw error;
    }

    this.ensureDirectory(bucketPath);
    this.buckets.set(bucketName, {
      name: bucketName,
      creationDate: new Date().toISOString(),
      region: params.CreateBucketConfiguration?.LocationConstraint || 'us-east-1'
    });

    return { Location: `/${bucketName}` };
  }

  /**
   * List buckets mock
   * @returns {Promise<Object>} ListBuckets response
   */
  async listBuckets() {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to list buckets');

    const buckets = Array.from(this.buckets.values()).map(bucket => ({
      Name: bucket.name,
      CreationDate: bucket.creationDate
    }));

    return {
      Buckets: buckets,
      Owner: {
        DisplayName: 'mock-owner',
        ID: generateId('owner')
      }
    };
  }

  /**
   * Put object mock
   * @param {Object} params - S3 putObject params
   * @returns {Promise<Object>} PutObject response
   */
  async putObject(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to upload object');

    const { Bucket, Key, Body, ContentType, Metadata = {} } = params;

    if (!this.buckets.has(Bucket)) {
      const error = new Error('NoSuchBucket');
      error.code = 'NoSuchBucket';
      throw error;
    }

    const objectPath = path.join(this.baseDir, Bucket, Key);
    const objectDir = path.dirname(objectPath);
    
    this.ensureDirectory(objectDir);

    // Write file to local filesystem
    if (Body instanceof Buffer) {
      fs.writeFileSync(objectPath, Body);
    } else if (typeof Body === 'string') {
      fs.writeFileSync(objectPath, Body, 'utf8');
    } else if (Body && typeof Body.pipe === 'function') {
      // Handle streams
      const writeStream = fs.createWriteStream(objectPath);
      Body.pipe(writeStream);
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
    }

    // Calculate ETag
    const content = fs.readFileSync(objectPath);
    const etag = crypto.createHash('md5').update(content).digest('hex');

    // Store object metadata
    const objectKey = `${Bucket}/${Key}`;
    this.objects.set(objectKey, {
      bucket: Bucket,
      key: Key,
      etag,
      size: content.length,
      lastModified: new Date().toISOString(),
      contentType: ContentType || 'application/octet-stream',
      metadata: Metadata
    });

    return {
      ETag: `"${etag}"`,
      VersionId: generateId('version')
    };
  }

  /**
   * Get object mock
   * @param {Object} params - S3 getObject params
   * @returns {Promise<Object>} GetObject response
   */
  async getObject(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to get object');

    const { Bucket, Key } = params;
    const objectKey = `${Bucket}/${Key}`;
    const objectMeta = this.objects.get(objectKey);

    if (!objectMeta) {
      const error = new Error('NoSuchKey');
      error.code = 'NoSuchKey';
      throw error;
    }

    const objectPath = path.join(this.baseDir, Bucket, Key);
    
    if (!fs.existsSync(objectPath)) {
      const error = new Error('NoSuchKey');
      error.code = 'NoSuchKey';
      throw error;
    }

    const body = fs.readFileSync(objectPath);

    return {
      Body: body,
      ContentType: objectMeta.contentType,
      ContentLength: objectMeta.size,
      ETag: `"${objectMeta.etag}"`,
      LastModified: objectMeta.lastModified,
      Metadata: objectMeta.metadata
    };
  }

  /**
   * Delete object mock
   * @param {Object} params - S3 deleteObject params
   * @returns {Promise<Object>} DeleteObject response
   */
  async deleteObject(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to delete object');

    const { Bucket, Key } = params;
    const objectKey = `${Bucket}/${Key}`;
    const objectPath = path.join(this.baseDir, Bucket, Key);

    if (fs.existsSync(objectPath)) {
      fs.unlinkSync(objectPath);
      this.objects.delete(objectKey);
    }

    return {
      DeleteMarker: true,
      VersionId: generateId('version')
    };
  }

  /**
   * List objects mock
   * @param {Object} params - S3 listObjects params
   * @returns {Promise<Object>} ListObjects response
   */
  async listObjectsV2(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to list objects');

    const { Bucket, Prefix = '', MaxKeys = 1000, ContinuationToken } = params;

    if (!this.buckets.has(Bucket)) {
      const error = new Error('NoSuchBucket');
      error.code = 'NoSuchBucket';
      throw error;
    }

    const bucketPath = path.join(this.baseDir, Bucket);
    const allObjects = [];

    // Recursively read directory
    const readDir = (dir, prefix = '') => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const key = path.join(prefix, file).replace(/\\/g, '/');
        
        if (stat.isDirectory()) {
          readDir(filePath, key);
        } else if (key.startsWith(Prefix)) {
          const objectKey = `${Bucket}/${key}`;
          const objectMeta = this.objects.get(objectKey) || {
            etag: crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex'),
            size: stat.size,
            lastModified: stat.mtime.toISOString()
          };
          
          allObjects.push({
            Key: key,
            LastModified: objectMeta.lastModified,
            ETag: `"${objectMeta.etag}"`,
            Size: objectMeta.size,
            StorageClass: 'STANDARD'
          });
        }
      });
    };

    if (fs.existsSync(bucketPath)) {
      readDir(bucketPath);
    }

    // Sort by key
    allObjects.sort((a, b) => a.Key.localeCompare(b.Key));

    // Handle pagination
    let startIndex = 0;
    if (ContinuationToken) {
      startIndex = parseInt(Buffer.from(ContinuationToken, 'base64').toString('utf8'));
    }

    const endIndex = Math.min(startIndex + MaxKeys, allObjects.length);
    const contents = allObjects.slice(startIndex, endIndex);
    const isTruncated = endIndex < allObjects.length;

    const response = {
      IsTruncated: isTruncated,
      Contents: contents,
      Name: Bucket,
      Prefix,
      MaxKeys,
      KeyCount: contents.length
    };

    if (isTruncated) {
      response.NextContinuationToken = Buffer.from(endIndex.toString()).toString('base64');
    }

    return response;
  }

  /**
   * Generate presigned URL mock
   * @param {string} operation - Operation name
   * @param {Object} params - Operation params
   * @returns {Promise<string>} Presigned URL
   */
  async getSignedUrl(operation, params) {
    await simulateDelay({ min: 10, max: 50 });

    const { Bucket, Key, Expires = 3600 } = params;
    const timestamp = Date.now();
    const signature = crypto
      .createHash('sha256')
      .update(`${operation}-${Bucket}-${Key}-${timestamp}`)
      .digest('hex')
      .substring(0, 16);

    return `https://s3.mock.amazonaws.com/${Bucket}/${Key}?` +
      `X-Amz-Algorithm=AWS4-HMAC-SHA256&` +
      `X-Amz-Expires=${Expires}&` +
      `X-Amz-Signature=${signature}&` +
      `X-Amz-Date=${new Date(timestamp).toISOString()}`;
  }

  /**
   * Copy object mock
   * @param {Object} params - S3 copyObject params
   * @returns {Promise<Object>} CopyObject response
   */
  async copyObject(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to copy object');

    const { Bucket, CopySource, Key } = params;
    const [sourceBucket, sourceKey] = CopySource.split('/').filter(Boolean);
    
    // Get source object
    const sourceData = await this.getObject({
      Bucket: sourceBucket,
      Key: sourceKey
    });

    // Put to destination
    return this.putObject({
      Bucket,
      Key,
      Body: sourceData.Body,
      ContentType: sourceData.ContentType,
      Metadata: sourceData.Metadata
    });
  }

  /**
   * Head object mock
   * @param {Object} params - S3 headObject params
   * @returns {Promise<Object>} HeadObject response
   */
  async headObject(params) {
    await simulateDelay(config.delays.aws.s3);
    simulateError(config.errorRates.aws, 'Failed to head object');

    const { Bucket, Key } = params;
    const objectKey = `${Bucket}/${Key}`;
    const objectMeta = this.objects.get(objectKey);

    if (!objectMeta) {
      const error = new Error('NotFound');
      error.code = 'NotFound';
      error.statusCode = 404;
      throw error;
    }

    return {
      ContentType: objectMeta.contentType,
      ContentLength: objectMeta.size,
      ETag: `"${objectMeta.etag}"`,
      LastModified: objectMeta.lastModified,
      Metadata: objectMeta.metadata
    };
  }

  /**
   * Clear all mock data
   */
  clearMockData() {
    // Remove all files
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true, force: true });
    }
    
    // Clear in-memory data
    this.buckets.clear();
    this.objects.clear();
    
    // Recreate base directory
    this.ensureDirectory(this.baseDir);
    this.initializeDefaultBuckets();
  }
}

// Export singleton instance
module.exports = new S3Mock();