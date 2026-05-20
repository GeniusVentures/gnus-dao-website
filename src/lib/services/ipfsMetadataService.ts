import { logger } from '@/lib/utils/logger';

export interface ProposalMetadata {
  title: string;
  description: string;
  author?: string;
  created?: string;
  tags?: string[];
  attachments?: {
    name: string;
    hash: string;
    type: string;
    size?: number;
  }[];
  actions?: {
    target: string;
    value: string;
    calldata: string;
    description: string;
  }[];
}

class IPFSMetadataService {
  private cache = new Map<string, ProposalMetadata>();
  private readonly IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
  ];

  /**
   * Fetch proposal metadata from IPFS
   */
  async fetchProposalMetadata(ipfsHash: string): Promise<ProposalMetadata | null> {
    if (!ipfsHash || ipfsHash === '0x' || ipfsHash.length === 0) {
      return null;
    }

    // Check cache first
    if (this.cache.has(ipfsHash)) {
      return this.cache.get(ipfsHash)!;
    }

    // Clean the IPFS hash (remove 0x prefix if present)
    const cleanHash = ipfsHash.startsWith('0x') ? ipfsHash.slice(2) : ipfsHash;
    
    // Convert hex to base58 if needed (IPFS hashes are typically base58)
    let actualHash = cleanHash;
    if (cleanHash.length === 64 && /^[0-9a-fA-F]+$/.test(cleanHash)) {
      // This might be a hex-encoded hash, try to convert it
      try {
        actualHash = this.hexToBase58(cleanHash);
      } catch (error) {
        logger.warn('Failed to convert hex hash to base58:', { hash: cleanHash, error });
        actualHash = cleanHash;
      }
    }

    // Try multiple IPFS gateways
    for (const gateway of this.IPFS_GATEWAYS) {
      try {
        const metadata = await this.fetchFromGateway(gateway, actualHash);
        if (metadata) {
          this.cache.set(ipfsHash, metadata);
          return metadata;
        }
      } catch (error) {
        logger.warn(`Failed to fetch from gateway ${gateway}:`, { error, hash: actualHash });
        continue;
      }
    }

    logger.error('Failed to fetch metadata from all IPFS gateways:', { hash: ipfsHash });
    return null;
  }

  /**
   * Fetch metadata from a specific IPFS gateway
   */
  private async fetchFromGateway(gateway: string, hash: string): Promise<ProposalMetadata | null> {
    const url = `${gateway}${hash}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        // Try to parse as text and then JSON
        const text = await response.text();
        try {
          const metadata = JSON.parse(text);
          return this.validateAndNormalizeMetadata(metadata);
        } catch (parseError) {
          throw new Error(`Invalid JSON content: ${text.slice(0, 100)}...`);
        }
      }

      const metadata = await response.json();
      return this.validateAndNormalizeMetadata(metadata);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error fetching from ${url}`);
    }
  }

  /**
   * Validate and normalize metadata structure
   */
  private validateAndNormalizeMetadata(data: any): ProposalMetadata | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Handle different metadata formats
    const metadata: ProposalMetadata = {
      title: data.title || data.name || 'Untitled Proposal',
      description: data.description || data.body || '',
      author: data.author || data.proposer,
      created: data.created || data.timestamp || data.createdAt,
      tags: Array.isArray(data.tags) ? data.tags : [],
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      actions: Array.isArray(data.actions) ? data.actions : [],
    };

    // Validate required fields
    if (!metadata.title && !metadata.description) {
      return null;
    }

    return metadata;
  }

  /**
   * Convert hex string to base58 (simplified version)
   * Note: This is a basic implementation. For production, consider using a proper library
   */
  private hexToBase58(hex: string): string {
    // This is a placeholder implementation
    // In a real application, you'd want to use a proper base58 conversion library
    // For now, we'll assume the hash is already in the correct format
    return hex;
  }

  /**
   * Upload metadata to IPFS (if you have upload capabilities)
   */
  async uploadMetadata(metadata: ProposalMetadata): Promise<string | null> {
    try {
      // This would integrate with your IPFS upload service (Pinata, Infura, etc.)
      // For now, this is a placeholder
      logger.info('IPFS upload not implemented yet');
      return null;
    } catch (error) {
      logger.error('Failed to upload metadata to IPFS:', { error, metadata });
      return null;
    }
  }

  /**
   * Clear the metadata cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Preload metadata for multiple hashes
   */
  async preloadMetadata(hashes: string[]): Promise<void> {
    const promises = hashes
      .filter(hash => hash && !this.cache.has(hash))
      .map(hash => this.fetchProposalMetadata(hash).catch(() => null));

    await Promise.allSettled(promises);
  }
}

// Export singleton instance
export const ipfsMetadataService = new IPFSMetadataService();