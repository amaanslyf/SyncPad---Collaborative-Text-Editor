import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../common/Avatar';
import { Button } from '../common/Button';
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

  return (
    <header className="header">
      <div className="header__left">
        {showBack && (
          <Link 
            to="/" 
            className="btn btn--ghost btn--icon" 
            aria-label="Back to documents"
            data-tooltip="Back to documents"
            data-tooltip-pos="bottom"
          >
            ←
          </Link>
        )}
        <Link to="/" className="header__logo">
          <svg className="header__logo-icon" viewBox="0 0 64 64" fill="none">
            <defs>
              <linearGradient id="logo-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#a8a4ff" />
                <stop offset="100%" stopColor="#675df9" />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="14" fill="var(--color-surface-container)" />
            <path d="M18 16h28a2 2 0 012 2v28a2 2 0 01-2 2H18a2 2 0 01-2-2V18a2 2 0 012-2z" stroke="url(#logo-g)" strokeWidth="2.5" fill="none" />
            <line x1="22" y1="24" x2="42" y2="24" stroke="url(#logo-g)" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="30" x2="38" y2="30" stroke="url(#logo-g)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            <line x1="22" y1="36" x2="34" y2="36" stroke="url(#logo-g)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
          </svg>
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
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
