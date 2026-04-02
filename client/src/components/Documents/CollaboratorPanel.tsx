import { useState, useEffect, useCallback } from 'react';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { documentsApi, ApiError } from '../../services/api';
import type { CollaboratorInfo } from '../../services/api';
import { ConfirmationModal } from '../common/ConfirmationModal';
import './CollaboratorPanel.css';

interface CollaboratorPanelProps {
  documentId: string;
  isPublic: boolean;
  ownerId: string;
}

export function CollaboratorPanel({ documentId, isPublic, ownerId }: CollaboratorPanelProps) {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [owner, setOwner] = useState<CollaboratorInfo | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [removingUser, setRemovingUser] = useState<{ id: string; name: string } | null>(null);

  const isOwner = user?.id === ownerId;

  const fetchCollaborators = useCallback(async () => {
    if (!token) return;
    try {
      const res = await documentsApi.getCollaborators(token, documentId);
      if (res.data) {
        setOwner(res.data.owner);
        setCollaborators(res.data.collaborators);
      }
    } catch {
      // Silent fail — panel is supplementary
    } finally {
      setIsLoading(false);
    }
  }, [token, documentId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleInvite = async () => {
    if (!token || !email.trim()) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const res = await documentsApi.addCollaborator(token, documentId, email.trim());
      if (res.data?.collaborators) {
        setCollaborators(res.data.collaborators);
      }
      showToast(res.message || 'Collaborator invited!', 'success');
      setEmail('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to invite collaborator';
      showToast(message, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!token || !removingUser) return;
    try {
      const res = await documentsApi.removeCollaborator(token, documentId, removingUser.id);
      if (res.data?.collaborators) {
        setCollaborators(res.data.collaborators);
      }
      showToast(`${removingUser.name} removed from document`, 'success');
      setRemovingUser(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to remove collaborator';
      showToast(message, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isInviting) {
      handleInvite();
    }
  };

  if (isLoading) {
    return (
      <div className="collab-panel">
        <div className="collab-panel__header">
          <h3 className="collab-panel__title">Collaborators</h3>
        </div>
        <div className="collab-panel__loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="collab-panel">
      <div className="collab-panel__header">
        <h3 className="collab-panel__title">
          {isPublic ? 'Document Access' : 'Collaborators'}
        </h3>
        {!isPublic && <span className="collab-panel__count">{collaborators.length + 1}</span>}
      </div>

      <div className="collab-panel__badge-row">
        <span className={`collab-panel__access-badge ${isPublic ? 'collab-panel__access-badge--public' : 'collab-panel__access-badge--private'}`}>
          {isPublic ? '🌐 Public' : '🔒 Private'}
        </span>
      </div>

      {/* Owner */}
      {owner && (
        <div className="collab-panel__section">
          <div className="collab-panel__section-label">Owner</div>
          <div className="collab-panel__user">
            <Avatar name={owner.displayName} color={owner.color} size="sm" />
            <div className="collab-panel__user-info">
              <span className="collab-panel__user-name">
                👑 {owner.displayName}
              </span>
              <span className="collab-panel__user-email">{owner.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Members — Only for Private documents */}
      {!isPublic && collaborators.length > 0 && (
        <div className="collab-panel__section">
          <div className="collab-panel__section-label">Members</div>
          <div className="collab-panel__list">
            {collaborators.map((collab) => (
              <div key={collab._id} className="collab-panel__user">
                <Avatar name={collab.displayName} color={collab.color} size="sm" />
                <div className="collab-panel__user-info">
                  <span className="collab-panel__user-name">{collab.displayName}</span>
                  <span className="collab-panel__user-email">{collab.email}</span>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemovingUser({ id: collab._id, name: collab.displayName })}
                    aria-label={`Remove ${collab.displayName}`}
                    data-tooltip="Remove collaborator"
                    className="collab-panel__remove-btn"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isPublic && collaborators.length === 0 && (
        <div className="collab-panel__empty">
          No collaborators yet. Invite someone below!
        </div>
      )}

      {/* Invite — Only for Private documents and Owners */}
      {!isPublic && isOwner && (
        <div className="collab-panel__invite">
          <div className="collab-panel__section-label">Invite by email</div>
          <div className="collab-panel__invite-row">
            <input
              className="input collab-panel__invite-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="user@example.com"
              disabled={isInviting}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleInvite}
              disabled={isInviting || !email.trim()}
            >
              {isInviting ? '…' : 'Invite'}
            </Button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!removingUser}
        onClose={() => setRemovingUser(null)}
        onConfirm={handleRemove}
        title="Remove Collaborator"
        message={`Are you sure you want to remove ${removingUser?.name} from this document? They will lose access immediately.`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
