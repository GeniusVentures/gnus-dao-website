/**
 * Type definitions for Cloudflare Workers
 */

declare global {
	interface KVNamespace {
		get(key: string, options?: { type: 'text' }): Promise<string | null>;
		get(key: string, options: { type: 'json' }): Promise<Record<string, unknown> | null>;
		get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
		get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;
		put(
			key: string,
			value: string | ArrayBuffer | ReadableStream,
			options?: {
				expiration?: number;
				expirationTtl?: number;
				metadata?: Record<string, unknown>;
			},
		): Promise<void>;
		delete(key: string): Promise<void>;
		list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
			keys: { name: string; expiration?: number; metadata?: Record<string, unknown> }[];
			list_complete: boolean;
			cursor?: string;
		}>;
	}

	interface PagesFunction<Env = unknown> {
		(context: {
			request: Request;
			env: Env;
			params: Record<string, string>;
			waitUntil: (promise: Promise<unknown>) => void;
			next: () => Promise<Response>;
			data: Record<string, unknown>;
		}): Response | Promise<Response>;
	}
}

export { };

