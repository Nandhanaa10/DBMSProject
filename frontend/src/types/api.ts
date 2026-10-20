export interface Meta { page: number; limit: number; total: number }
export interface ApiSuccess<T> { data: T; meta?: Meta }
export interface ApiErrorBody { error: { code: string; message: string } }
