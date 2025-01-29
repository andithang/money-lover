export interface ResponseError {
  code: number;
  data: unknown;
  message: string;
}

export interface CustomHttpResponseError {
  error: ResponseError;
  status: number;
}