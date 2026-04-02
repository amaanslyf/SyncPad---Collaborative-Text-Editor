import { describe, it, expect } from 'vitest';
import Document from '../../src/models/Document.js';

describe('Document Model', () => {
  it('should be valid if all required fields are provided', () => {
    const doc = new Document({
      title: 'Valid Document',
      owner: '507f1f77bcf86cd799439011', // Valid ObjectId string
      lastEditedBy: '507f1f77bcf86cd799439011',
    });

    const error = doc.validateSync();
    expect(error).toBeUndefined();
  });

  it('should be invalid if required fields are empty', () => {
    const doc = new Document({});

    const error = Object.keys(doc.validateSync().errors);
    expect(error).toContain('owner');
  });

  it('should apply defaults properly', () => {
    const doc = new Document({
      owner: '507f1f77bcf86cd799439011',
    });

    // Validating defaults
    expect(doc.title).toBe('Untitled Document');
    expect(doc.isPublic).toBe(true);
    expect(doc.collaborators).toEqual([]);
    expect(doc.revisions).toEqual([]);
  });
});
