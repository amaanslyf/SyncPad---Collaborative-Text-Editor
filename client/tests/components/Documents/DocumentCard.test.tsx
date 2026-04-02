import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentCard } from '../../../src/components/Documents/DocumentCard';
import { MemoryRouter } from 'react-router-dom';

describe('DocumentCard', () => {
  const mockDoc = {
    _id: 'doc123',
    id: 'doc123',
    title: 'My Important Notes',
    owner: { _id: 'user1', displayName: 'Alice', email: 'alice@test.com', color: '#ff0000' },
    collaborators: [],
    lastEditedBy: { displayName: 'Bob', color: '#00ff00' },
    isPublic: false,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(), // recent update
  };

  it('should display the document title', () => {
    render(
      <MemoryRouter>
        <DocumentCard document={mockDoc} />
      </MemoryRouter>
    );
    expect(screen.getByText('My Important Notes')).toBeInTheDocument();
  });

  it('should indicate public visibility if public', () => {
    const pubDoc = { ...mockDoc, isPublic: true };
    render(
      <MemoryRouter>
        <DocumentCard document={pubDoc} />
      </MemoryRouter>
    );
    expect(screen.getByText('Public')).toBeInTheDocument();
    expect(screen.queryByText('🔒 Private')).not.toBeInTheDocument();
  });

  it('should call onDelete when delete button triggered and confirmed', async () => {
    const mockOnDelete = vi.fn();
    // Use an owner document so the delete button shows via "isOwner" internal boolean logic mapping
    render(
      <MemoryRouter>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <DocumentCard document={mockDoc as any} onDelete={mockOnDelete} />
      </MemoryRouter>
    );

    const user = userEvent.setup();
    const delButton = screen.getByRole('button', { name: /Delete/i });
    
    await user.click(delButton);

    expect(mockOnDelete).toHaveBeenCalledWith('doc123');
  });


});
