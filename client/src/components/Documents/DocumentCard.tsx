import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import type { DocumentMeta } from '../../services/api';
import './Documents.css';

interface DocumentCardProps {
  document: DocumentMeta;
  onDelete?: (id: string) => void;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
  return (
    <Link to={`/doc/${doc._id}`} className="doc-card" id={`doc-card-${doc._id}`}>
      <div className="doc-card__title">{doc.title || 'Untitled Document'}</div>
      <div className="doc-card__owner">
        by {doc.owner?.displayName || 'Unknown'}
        {doc.isPublic && (
          <span 
            className="doc-card__badge" 
            data-tooltip="Public document"
            aria-label="Public document"
          >
            🌍
          </span>
        )}
      </div>
      <div className="doc-card__meta">
        <span className="doc-card__time">
          ✎ {formatTimeAgo(doc.updatedAt)}
        </span>
        {doc.lastEditedBy && (
          <div className="doc-card__collaborators">
            <Avatar
              name={doc.lastEditedBy.displayName}
              color={doc.lastEditedBy.color}
              size="sm"
              className="doc-card__collaborator-avatar"
            />
          </div>
        )}
      </div>
      {onDelete && (
        <div className="doc-card__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(doc._id);
            }}
            aria-label={`Delete ${doc.title}`}
            data-tooltip="Delete document"
          >
            🗑
          </Button>
        </div>
      )}
    </Link>
  );
}

interface CreateDocumentCardProps {
  onClick: () => void;
}

export function CreateDocumentCard({ onClick }: CreateDocumentCardProps) {
  return (
    <button className="doc-card doc-card--create" onClick={onClick} id="create-doc-card">
      <span className="doc-card--create__icon">+</span>
      <span className="doc-card--create__text">New Document</span>
    </button>
  );
}
