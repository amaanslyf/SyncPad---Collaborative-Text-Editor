import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
import { ConfirmationModal } from '../common/ConfirmationModal';
import './Layout.css';

interface HeaderProps {
  /** Document title — if provided, shows editable title in center */
  docTitle?: string;
  onTitleChange?: (title: string) => void;
  /** Connection status for editor page */
  isConnected?: boolean;
  /** Show back button to home */
  showBack?: boolean;
}

export function Header({ docTitle, onTitleChange, isConnected, showBack }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  return (
    <header className="header">
      <div className="header__left">
        {showBack && (
          <Link 
            to="/" 
            className="btn btn--ghost btn--icon header__back-btn" 
            aria-label="Back to documents"
            data-tooltip="Back to documents"
            data-tooltip-pos="bottom"
          >
            ←
          </Link>
        )}
        <Link to="/" className="header__logo">
          <img src="/assets/logo.png" alt="SyncPad Logo" className="header__logo-img" />
          <span className="header__logo-text">SyncPad</span>
        </Link>
      </div>

      {docTitle !== undefined && (
        <div className="header__center">
          <input
            className="header__doc-title"
            value={docTitle}
            onChange={(e) => onTitleChange?.(e.target.value)}
            onBlur={(e) => onTitleChange?.(e.target.value)}
            placeholder="Untitled Document"
            aria-label="Document title"
          />
        </div>
      )}

      <div className="header__right">
        {isConnected !== undefined && (
          <div className="header__status">
            <span className={`header__status-dot ${!isConnected ? 'header__status-dot--disconnected' : ''}`} />
            <span>{isConnected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
        )}
        {user && (
          <div className="header__user">
            <span className="header__user-name">{user.displayName}</span>
            <Avatar name={user.displayName} color={user.color} size="sm" />
            <Button variant="ghost" size="sm" onClick={() => setIsLogoutModalOpen(true)}>
              Logout
            </Button>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmText="Logout"
      />
    </header>
  );
}
