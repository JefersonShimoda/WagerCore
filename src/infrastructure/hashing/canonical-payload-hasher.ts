import { Injectable } from '@nestjs/common';
import canonicalize from 'canonicalize';
import { createHash } from 'crypto';
import { PayloadHasher } from '../../application/ports/hashing/payload-hasher.port.js';

@Injectable()
export class CanonicalPayloadHasher implements PayloadHasher {
  hash(payload: any): string {
    const canonicalString = canonicalize(payload);
    if (!canonicalString) {
      throw new Error('Failed to canonicalize payload');
    }
    return createHash('sha256').update(canonicalString).digest('hex');
  }
}
