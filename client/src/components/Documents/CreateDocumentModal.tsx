import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import '../common/common.css';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, isPublic: boolean, emails: string[]) => Promise<void>;
}

export function CreateDocumentModal({ isOpen, onClose, onCreate }: CreateDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (emails.includes(trimmed)) {
      setEmailError('This email has already been added');
      return;
    }

    setEmails((prev) => [...prev, trimmed]);
    setEmailInput('');
    setEmailError('');
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreate(title.trim() || 'Untitled Document', isPublic, isPublic ? [] : emails);
      resetForm();
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setIsPublic(true);
    setEmails([]);
    setEmailInput('');
    setEmailError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAccessChange = (pub: boolean) => {
    setIsPublic(pub);
    if (pub) {
      // Clear email state when switching to public
      setEmails([]);
      setEmailInput('');
      setEmailError('');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      if (isPublic) {
        handleCreate();
      }
      // Don't auto-create for private — user likely needs to add emails first
    }
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Document"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating…' : 'Create Document'}
          </Button>
        </>
      }
    >
      <div className="create-doc-form">
        <div className="input-group">
          <label className="input-label" htmlFor="doc-title-input">
            Document Name
          </label>
          <input
            id="doc-title-input"
            className="input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled Document"
            autoFocus
            maxLength={200}
          />
        </div>

        <div className="input-group" style={{ marginTop: 'var(--spacing-6)' }}>
          <label className="input-label">Access Level</label>
          <div className="access-toggle">
            <button
              type="button"
              className={`access-toggle__option ${isPublic ? 'access-toggle__option--active' : ''}`}
              onClick={() => handleAccessChange(true)}
            >
              <span className="access-toggle__icon">🌐</span>
              <span className="access-toggle__label">Public</span>
              <span className="access-toggle__desc">Anyone can view and edit</span>
            </button>
            <button
              type="button"
              className={`access-toggle__option ${!isPublic ? 'access-toggle__option--active' : ''}`}
              onClick={() => handleAccessChange(false)}
            >
              <span className="access-toggle__icon">🔒</span>
              <span className="access-toggle__label">Private</span>
              <span className="access-toggle__desc">Only invited collaborators</span>
            </button>
          </div>
        </div>

        {/* Email invite section — only for Private documents */}
        {!isPublic && (
          <div className="invite-emails-section">
            <label className="input-label">Invite Collaborators</label>
            <p className="invite-emails-section__hint">
              Add emails of users you want to collaborate with. They must have a SyncPad account.
            </p>
            <div className="invite-emails-section__input-row">
              <input
                className="input invite-emails-section__input"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setEmailError('');
                }}
                onKeyDown={handleEmailKeyDown}
                placeholder="user@example.com"
                disabled={isCreating}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={addEmail}
                disabled={isCreating || !emailInput.trim()}
              >
                Add
              </Button>
            </div>
            {emailError && <p className="invite-emails-section__error">{emailError}</p>}

            {emails.length > 0 && (
              <div className="email-chip-list">
                {emails.map((email) => (
                  <span key={email} className="email-chip">
                    <span className="email-chip__text">{email}</span>
                    <button
                      type="button"
                      className="email-chip__remove"
                      onClick={() => removeEmail(email)}
                      aria-label={`Remove ${email}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {emails.length === 0 && (
              <p className="invite-emails-section__empty">
                No collaborators added yet. You can also invite people later from the editor.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
