import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentCard, CreateDocumentCard } from './DocumentCard';
import { CreateDocumentModal } from './CreateDocumentModal';
import { Spinner } from '../common/Spinner';
import { useToast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ApiError } from '../../services/api';
import './Documents.css';

export function DocumentList() {
  const { documents, isLoading, error, fetchDocuments, createDocument, deleteDocument } =
    useDocuments();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  const handleCreate = async (title: string, isPublic: boolean, emails: string[]) => {
    try {
      const result = await createDocument(title, isPublic, emails.length > 0 ? emails : undefined);
      if (result && result.document) {
        // Show warnings for unregistered emails
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach((w: string) => showToast(w, 'warning'));
        }
        setIsCreateModalOpen(false);
        navigate(`/doc/${result.document._id}`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to create document';
      showToast(message, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDocument(deleteId);
      showToast('Document deleted', 'success');
    } catch (err) {
      // Use the specific error message from the server (e.g. "Only the owner can delete this document")
      const message = err instanceof ApiError ? err.message : 'Failed to delete document';
      showToast(message, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-16)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <>
        <div className="documents-empty">
          <div className="documents-empty__icon">📝</div>
          <h2 className="documents-empty__title">No documents yet</h2>
          <p className="documents-empty__description">
            Create your first document and start collaborating in real-time with your team.
          </p>
          <button className="btn btn--primary btn--lg" onClick={() => setIsCreateModalOpen(true)}>
            Create your first document
          </button>
        </div>
        <CreateDocumentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreate}
        />
      </>
    );
  }

  return (
    <div className="doc-grid">
      <CreateDocumentCard onClick={() => setIsCreateModalOpen(true)} />
      {documents.map((doc, index) => (
        <div
          key={doc._id}
          className="animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
        >
          <DocumentCard document={doc} onDelete={(id) => setDeleteId(id)} />
        </div>
      ))}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
