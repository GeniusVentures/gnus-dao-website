/**
 * Type definitions for Cloudflare Workers
 */

declare global {
	interface KVNamespace {
		get(key: string, options?: { type: 'text' }): Promise<string | null>;
		get(key: string, options: { type: 'json' }): Promise<any | null>;
		get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
		get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;
		put(
			key: string,
			value: string | ArrayBuffer | ReadableStream,
			options?: {
				expiration?: number;
				expirationTtl?: number;
				metadata?: any;
			},
		): Promise<void>;
		delete(key: string): Promise<void>;
		list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
			keys: { name: string; expiration?: number; metadata?: any }[];
			list_complete: boolean;
			cursor?: string;
		}>;
	}

	interface PagesFunction<Env = unknown> {
		(context: {
			request: Request;
			env: Env;
			params: Record<string, string>;
			waitUntil: (promise: Promise<any>) => void;
			next: () => Promise<Response>;
			data: Record<string, any>;
		}): Response | Promise<Response>;
	}
}

export {};
