export interface Env {
  API_AUTH_TOKEN: string;
  SHARED_SECRET: string;
  MONGODB_URI: string;
  MONGODB_DATABASE: string;
  ENVIRONMENT?: string; // 'dev' or 'prod', defaults to 'dev'
}
