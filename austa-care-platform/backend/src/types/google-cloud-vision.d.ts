declare namespace vision {
  export interface ImageAnnotatorClient {
    textDetection(request: { image: { content: string } }): Promise<any>;
    documentTextDetection(request: { image: { content: string } }): Promise<any>;
    objectLocalization(request: { image: { content: string } }): Promise<any>;
    logoDetection(request: { image: { content: string } }): Promise<any>;
    labelDetection(request: { image: { content: string } }): Promise<any>;
    faceDetection(request: { image: { content: string } }): Promise<any>;
    landmarkDetection(request: { image: { content: string } }): Promise<any>;
    webDetection(request: { image: { content: string } }): Promise<any>;
    imagePropertiesDetection(request: { image: { content: string } }): Promise<any>;
    safeSearchDetection(request: { image: { content: string } }): Promise<any>;
    cropHintsDetection(request: { image: { content: string } }): Promise<any>;
  }
  
  export interface TextAnnotation {
    description: string;
    boundingPoly: {
      vertices: Array<{
        x: number;
        y: number;
      }>;
    };
  }
  
  export interface AnnotateImageResponse {
    textAnnotations: TextAnnotation[];
    fullTextAnnotation: {
      text: string;
      pages: any[];
    };
  }
}