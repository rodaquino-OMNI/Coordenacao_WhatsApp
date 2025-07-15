declare namespace AWS {
  export interface Textract {
    analyzeDocument(params: {
      Document: {
        Bytes?: Buffer;
        S3Object?: {
          Bucket: string;
          Name: string;
          Version?: string;
        };
      };
      FeatureTypes: string[];
    }): {
      promise(): Promise<{
        Blocks: Array<{
          BlockType: string;
          Confidence: number;
          Text?: string;
          Geometry?: {
            BoundingBox: {
              Width: number;
              Height: number;
              Left: number;
              Top: number;
            };
          };
        }>;
      }>;
    };
    
    detectDocumentText(params: {
      Document: {
        Bytes?: Buffer;
        S3Object?: {
          Bucket: string;
          Name: string;
          Version?: string;
        };
      };
    }): {
      promise(): Promise<{
        Blocks: Array<{
          BlockType: string;
          Confidence: number;
          Text?: string;
        }>;
      }>;
    };
  }
  
  export interface Config {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
  }
}