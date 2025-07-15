/**
 * AWS Textract Service
 * Core implementation for medical document OCR processing
 */

import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import {
  TextractConfiguration,
  TextractResponse,
  TextractBlock,
  TextractFormField,
  TextractTable,
  ProcessedDocument,
  TextractProcessingOptions,
  ProcessingStatus
} from '../types/medical-document.types';
import { TEXTRACT_CONFIG, DEFAULT_PROCESSING_OPTIONS } from '../config/textract.config';
import { TextractError } from '../errors/textract.errors';
import { logger } from '../../../utils/logger';

export class TextractService {
  private textract: AWS.Textract;
  private s3: AWS.S3;
  private config: TextractConfiguration;

  constructor(config?: Partial<TextractConfiguration>) {
    this.config = { ...TEXTRACT_CONFIG, ...config };
    
    AWS.config.update({
      region: this.config.region,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey
    });

    this.textract = new AWS.Textract({
      apiVersion: '2018-06-27',
      region: this.config.region,
      maxRetries: 3,
      retryDelayOptions: {
        customBackoff: (retryCount: number) => Math.pow(2, retryCount) * 1000
      }
    });

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      region: this.config.region
    });
  }

  /**
   * Process a document using AWS Textract with comprehensive medical document analysis
   */
  async processDocument(
    s3Key: string,
    options: Partial<TextractProcessingOptions> = {}
  ): Promise<ProcessedDocument> {
    const processingOptions = { ...DEFAULT_PROCESSING_OPTIONS, ...options };
    const documentId = uuidv4();
    const startTime = new Date();

    logger.info(`Starting Textract processing for document: ${s3Key}`, {
      documentId,
      s3Key,
      options: processingOptions
    });

    try {
      // Initialize processing document
      const processedDoc: Partial<ProcessedDocument> = {
        id: documentId,
        originalFileName: s3Key.split('/').pop() || s3Key,
        s3Key,
        status: ProcessingStatus.PROCESSING,
        processingStartTime: startTime,
        blocks: [],
        forms: [],
        tables: [],
        medicalEntities: [],
        validationErrors: [],
        requiresHumanReview: false,
        processingHistory: [
          {
            timestamp: startTime,
            event: 'PROCESSING_STARTED',
            details: { s3Key, options: processingOptions }
          }
        ]
      };

      // Determine processing method based on document size and complexity
      const documentMetadata = await this.getDocumentMetadata(s3Key);
      const useAsyncProcessing = documentMetadata.pages > 1 || documentMetadata.sizeBytes > 5 * 1024 * 1024; // 5MB

      let textractResponse: TextractResponse;

      if (useAsyncProcessing) {
        textractResponse = await this.processDocumentAsync(s3Key, processingOptions);
      } else {
        textractResponse = await this.processDocumentSync(s3Key, processingOptions);
      }

      // Process Textract results
      const blocks = this.parseTextractBlocks(textractResponse.blocks);
      const forms = processingOptions.enableForms ? this.extractForms(blocks) : [];
      const tables = processingOptions.enableTables ? this.extractTables(blocks) : [];

      // Calculate confidence and quality metrics
      const overallConfidence = this.calculateOverallConfidence(blocks);
      const qualityScore = this.calculateQualityScore(blocks, documentMetadata);

      // Determine if human review is required
      const requiresHumanReview = this.shouldRequireHumanReview(
        overallConfidence,
        qualityScore,
        processingOptions
      );

      // Complete processed document
      const completedDoc: ProcessedDocument = {
        ...processedDoc as ProcessedDocument,
        pages: documentMetadata.pages,
        blocks,
        forms,
        tables,
        processingEndTime: new Date(),
        overallConfidence,
        qualityScore,
        requiresHumanReview,
        status: requiresHumanReview ? ProcessingStatus.HUMAN_REVIEW : ProcessingStatus.EXTRACTED,
        processingHistory: [
          ...processedDoc.processingHistory!,
          {
            timestamp: new Date(),
            event: 'TEXTRACT_COMPLETED',
            details: {
              confidence: overallConfidence,
              qualityScore,
              requiresHumanReview,
              blocksExtracted: blocks.length,
              formsExtracted: forms.length,
              tablesExtracted: tables.length
            }
          }
        ]
      };

      logger.info(`Textract processing completed for document: ${s3Key}`, {
        documentId,
        processingTime: Date.now() - startTime.getTime(),
        confidence: overallConfidence,
        qualityScore,
        requiresHumanReview
      });

      return completedDoc;

    } catch (error) {
      logger.error(`Textract processing failed for document: ${s3Key}`, {
        documentId,
        error: error.message,
        stack: error.stack
      });

      throw new TextractError(
        `Failed to process document ${s3Key}: ${error.message}`,
        'PROCESSING_FAILED',
        { documentId, s3Key, originalError: error }
      );
    }
  }

  /**
   * Process document synchronously (for smaller documents)
   */
  private async processDocumentSync(
    s3Key: string,
    options: TextractProcessingOptions
  ): Promise<TextractResponse> {
    const params: AWS.Textract.DetectDocumentTextRequest = {
      Document: {
        S3Object: {
          Bucket: this.config.bucketName,
          Name: s3Key
        }
      }
    };

    try {
      let result: AWS.Textract.DetectDocumentTextResponse;

      if (options.enableForms || options.enableTables) {
        // Use AnalyzeDocument for forms and tables
        const analyzeParams: AWS.Textract.AnalyzeDocumentRequest = {
          Document: params.Document,
          FeatureTypes: []
        };

        if (options.enableForms) {
          analyzeParams.FeatureTypes!.push('FORMS');
        }
        if (options.enableTables) {
          analyzeParams.FeatureTypes!.push('TABLES');
        }
        if (options.enableQueries && options.customQueries?.length) {
          analyzeParams.FeatureTypes!.push('QUERIES');
          analyzeParams.QueriesConfig = {
            Queries: options.customQueries.map(query => ({ Text: query }))
          };
        }

        result = await this.textract.analyzeDocument(analyzeParams).promise();
      } else {
        // Use DetectDocumentText for simple text extraction
        result = await this.textract.detectDocumentText(params).promise();
      }

      return {
        status: 'SUCCEEDED',
        blocks: result.Blocks || [],
        metadata: {
          pages: this.countPages(result.Blocks || []),
          processingTime: 0,
          documentMetadata: result.DocumentMetadata
        }
      };

    } catch (error) {
      logger.error('Synchronous Textract processing failed', {
        s3Key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Process document asynchronously (for larger documents)
   */
  private async processDocumentAsync(
    s3Key: string,
    options: TextractProcessingOptions
  ): Promise<TextractResponse> {
    const startTime = Date.now();

    try {
      // Start async job
      let jobParams: any = {
        DocumentLocation: {
          S3Object: {
            Bucket: this.config.bucketName,
            Name: s3Key
          }
        },
        OutputConfig: {
          S3Bucket: this.config.bucketName,
          S3Prefix: `textract-output/${s3Key.replace(/\//g, '_')}`
        }
      };

      let startJobResult: any;

      if (options.enableForms || options.enableTables) {
        const featureTypes = [];
        if (options.enableForms) featureTypes.push('FORMS');
        if (options.enableTables) featureTypes.push('TABLES');
        if (options.enableQueries) featureTypes.push('QUERIES');

        jobParams.FeatureTypes = featureTypes;

        if (options.enableQueries && options.customQueries?.length) {
          jobParams.QueriesConfig = {
            Queries: options.customQueries.map(query => ({ Text: query }))
          };
        }

        startJobResult = await this.textract.startDocumentAnalysis(jobParams).promise();
      } else {
        startJobResult = await this.textract.startDocumentTextDetection(jobParams).promise();
      }

      const jobId = startJobResult.JobId;
      logger.info(`Started async Textract job: ${jobId}`, { s3Key });

      // Poll for job completion
      const result = await this.pollJobCompletion(jobId, options.enableForms || options.enableTables);

      return {
        jobId,
        status: result.JobStatus === 'SUCCEEDED' ? 'SUCCEEDED' : 'FAILED',
        blocks: result.Blocks || [],
        warnings: result.Warnings?.map(w => w.ErrorCode + ': ' + w.Pages?.join(',')) || [],
        metadata: {
          pages: this.countPages(result.Blocks || []),
          processingTime: Date.now() - startTime,
          documentMetadata: result.DocumentMetadata
        }
      };

    } catch (error) {
      logger.error('Asynchronous Textract processing failed', {
        s3Key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Poll job completion status
   */
  private async pollJobCompletion(
    jobId: string,
    isAnalyzeJob: boolean,
    maxPollingTime: number = this.config.timeoutMs
  ): Promise<any> {
    const startTime = Date.now();
    const pollingInterval = 5000; // 5 seconds

    while (Date.now() - startTime < maxPollingTime) {
      try {
        const result = isAnalyzeJob
          ? await this.textract.getDocumentAnalysis({ JobId: jobId }).promise()
          : await this.textract.getDocumentTextDetection({ JobId: jobId }).promise();

        if (result.JobStatus === 'SUCCEEDED') {
          // Get all pages if multi-page
          const allBlocks = [...(result.Blocks || [])];
          let nextToken = result.NextToken;

          while (nextToken) {
            const nextResult = isAnalyzeJob
              ? await this.textract.getDocumentAnalysis({ JobId: jobId, NextToken: nextToken }).promise()
              : await this.textract.getDocumentTextDetection({ JobId: jobId, NextToken: nextToken }).promise();

            allBlocks.push(...(nextResult.Blocks || []));
            nextToken = nextResult.NextToken;
          }

          return {
            ...result,
            Blocks: allBlocks
          };
        }

        if (result.JobStatus === 'FAILED') {
          throw new TextractError(
            `Textract job failed: ${result.StatusMessage}`,
            'JOB_FAILED',
            { jobId, statusMessage: result.StatusMessage }
          );
        }

        // Continue polling
        await new Promise(resolve => setTimeout(resolve, pollingInterval));

      } catch (error) {
        if (error instanceof TextractError) {
          throw error;
        }
        logger.warn(`Error polling job ${jobId}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }

    throw new TextractError(
      `Textract job ${jobId} timed out after ${maxPollingTime}ms`,
      'JOB_TIMEOUT',
      { jobId, maxPollingTime }
    );
  }

  /**
   * Parse Textract blocks into our internal format
   */
  private parseTextractBlocks(blocks: any[]): TextractBlock[] {
    return blocks.map(block => ({
      id: block.Id,
      blockType: block.BlockType,
      confidence: block.Confidence || 0,
      text: block.Text,
      geometry: block.Geometry ? {
        boundingBox: block.Geometry.BoundingBox,
        polygon: block.Geometry.Polygon
      } : undefined,
      relationships: block.Relationships,
      entityTypes: block.EntityTypes,
      page: block.Page
    }));
  }

  /**
   * Extract form fields from Textract blocks
   */
  private extractForms(blocks: TextractBlock[]): TextractFormField[] {
    const keyValuePairs: TextractFormField[] = [];
    const keyBlocks = blocks.filter(block => block.blockType === 'KEY_VALUE_SET' && 
                                            block.entityTypes?.includes('KEY'));

    for (const keyBlock of keyBlocks) {
      const valueBlockId = keyBlock.relationships?.find(rel => rel.type === 'VALUE')?.ids[0];
      if (!valueBlockId) continue;

      const valueBlock = blocks.find(block => block.id === valueBlockId);
      if (!valueBlock) continue;

      // Get child text blocks
      const keyText = this.getChildText(keyBlock, blocks);
      const valueText = this.getChildText(valueBlock, blocks);

      keyValuePairs.push({
        key: {
          text: keyText,
          confidence: keyBlock.confidence,
          boundingBox: keyBlock.geometry?.boundingBox
        },
        value: {
          text: valueText,
          confidence: valueBlock.confidence,
          boundingBox: valueBlock.geometry?.boundingBox
        }
      });
    }

    return keyValuePairs;
  }

  /**
   * Extract tables from Textract blocks
   */
  private extractTables(blocks: TextractBlock[]): TextractTable[] {
    const tables: TextractTable[] = [];
    const tableBlocks = blocks.filter(block => block.blockType === 'TABLE');

    for (const tableBlock of tableBlocks) {
      const cellBlocks = this.getRelatedBlocks(tableBlock, blocks, 'CHILD')
                            .filter(block => block.blockType === 'CELL');

      // Build table structure
      const tableData: { [key: string]: string } = {};
      let maxRow = 0;
      let maxCol = 0;

      for (const cell of cellBlocks) {
        const cellText = this.getChildText(cell, blocks);
        const rowIndex = (cell as any).RowIndex || 1;
        const colIndex = (cell as any).ColumnIndex || 1;
        
        tableData[`${rowIndex}-${colIndex}`] = cellText;
        maxRow = Math.max(maxRow, rowIndex);
        maxCol = Math.max(maxCol, colIndex);
      }

      // Convert to array format
      const headers: string[] = [];
      const rows: string[][] = [];

      // Extract headers (first row)
      for (let col = 1; col <= maxCol; col++) {
        headers.push(tableData[`1-${col}`] || '');
      }

      // Extract data rows
      for (let row = 2; row <= maxRow; row++) {
        const rowData: string[] = [];
        for (let col = 1; col <= maxCol; col++) {
          rowData.push(tableData[`${row}-${col}`] || '');
        }
        rows.push(rowData);
      }

      tables.push({
        id: tableBlock.id,
        headers,
        rows,
        confidence: tableBlock.confidence,
        page: tableBlock.page || 1,
        boundingBox: tableBlock.geometry?.boundingBox
      });
    }

    return tables;
  }

  /**
   * Get child text from a block
   */
  private getChildText(block: TextractBlock, allBlocks: TextractBlock[]): string {
    const childIds = block.relationships?.find(rel => rel.type === 'CHILD')?.ids || [];
    const words = childIds
      .map(id => allBlocks.find(b => b.id === id))
      .filter(b => b && b.blockType === 'WORD')
      .map(b => b.text)
      .filter(Boolean);
    
    return words.join(' ');
  }

  /**
   * Get related blocks by relationship type
   */
  private getRelatedBlocks(
    block: TextractBlock,
    allBlocks: TextractBlock[],
    relationshipType: string
  ): TextractBlock[] {
    const relationshipIds = block.relationships?.find(rel => rel.type === relationshipType)?.ids || [];
    return relationshipIds
      .map(id => allBlocks.find(b => b.id === id))
      .filter(Boolean) as TextractBlock[];
  }

  /**
   * Count pages in blocks
   */
  private countPages(blocks: any[]): number {
    const pages = new Set(blocks.map(block => block.Page || 1));
    return pages.size;
  }

  /**
   * Get document metadata from S3
   */
  private async getDocumentMetadata(s3Key: string): Promise<any> {
    try {
      const headResult = await this.s3.headObject({
        Bucket: this.config.bucketName,
        Key: s3Key
      }).promise();

      return {
        sizeBytes: headResult.ContentLength || 0,
        lastModified: headResult.LastModified,
        contentType: headResult.ContentType,
        pages: 1 // Default, will be updated after processing
      };
    } catch (error) {
      logger.warn(`Could not get metadata for ${s3Key}:`, error.message);
      return { sizeBytes: 0, pages: 1 };
    }
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(blocks: TextractBlock[]): number {
    const confidenceScores = blocks
      .filter(block => block.confidence > 0)
      .map(block => block.confidence);

    if (confidenceScores.length === 0) return 0;

    return confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length;
  }

  /**
   * Calculate quality score based on various metrics
   */
  private calculateQualityScore(blocks: TextractBlock[], metadata: any): number {
    // Basic quality assessment based on confidence and text coverage
    const textBlocks = blocks.filter(block => block.blockType === 'WORD' && block.text);
    
    if (textBlocks.length === 0) return 0;

    const avgConfidence = textBlocks.reduce((sum, block) => sum + block.confidence, 0) / textBlocks.length;
    const textCoverage = textBlocks.length / blocks.length;
    
    // Weight different factors
    const qualityScore = (avgConfidence * 0.7) + (textCoverage * 0.3);

    return Math.min(Math.max(qualityScore, 0), 1);
  }

  /**
   * Determine if human review is required
   */
  private shouldRequireHumanReview(
    confidence: number,
    qualityScore: number,
    options: TextractProcessingOptions
  ): boolean {
    if (options.requireHumanReview) return true;
    
    return confidence < options.confidenceThreshold || 
           qualityScore < 0.7;
  }

  /**
   * Get processing status for a job
   */
  async getJobStatus(jobId: string): Promise<{ status: string; progress?: number }> {
    try {
      const result = await this.textract.getDocumentAnalysis({ JobId: jobId }).promise();
      return {
        status: result.JobStatus || 'UNKNOWN',
        progress: this.calculateJobProgress(result)
      };
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error.message);
      throw new TextractError(
        `Failed to get job status: ${error.message}`,
        'STATUS_CHECK_FAILED',
        { jobId }
      );
    }
  }

  /**
   * Calculate job progress percentage
   */
  private calculateJobProgress(result: any): number {
    // AWS Textract doesn't provide explicit progress, so we estimate
    if (result.JobStatus === 'SUCCEEDED') return 100;
    if (result.JobStatus === 'FAILED') return 0;
    if (result.JobStatus === 'IN_PROGRESS') return 50; // Estimate
    return 0;
  }
}