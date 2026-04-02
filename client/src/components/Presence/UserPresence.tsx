import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../common/Avatar';
import type { PresenceUser } from '../../hooks/usePresence';
import './Presence.css';

interface UserPresenceProps {
  users: PresenceUser[];
  variant?: 'full' | 'compact';
}

export function UserPresence({ users, variant = 'full' }: UserPresenceProps) {
  const { user: currentUser } = useAuth();

  if (variant === 'compact') {
    return (
      <div className="presence-compact">
        <div className="presence-compact__avatars">
          {currentUser && (
            <Avatar
              name={currentUser.displayName}
              color={currentUser.color}
              size="sm"
              className="presence-compact__avatar"
            />
          )}
          {users.slice(0, 4).map((u) => (
            <Avatar
              key={u.clientId}
              name={u.name}
              color={u.color}
              size="sm"
              className="presence-compact__avatar"
            />
          ))}
        </div>
        {users.length > 4 && (
          <span className="presence-compact__more">+{users.length - 4}</span>
        )}
      </div>
    );
  }

  return (
    <div className="presence">
      <div className="presence__header">
        <span className="presence__title">Online</span>
        <span className="presence__count">{users.length + 1}</span>
      </div>
      <div className="presence__list">
        {/* Current user always first */}
        {currentUser && (
          <div className="presence__user">
            <Avatar name={currentUser.displayName} color={currentUser.color} size="sm" />
            <div className="presence__user-info">
              <div className="presence__user-name">
                {currentUser.displayName}
                <span className="presence__you-badge"> (you)</span>
              </div>
              <div className="presence__user-status">Editing</div>
            </div>
            <span className="presence__user-dot" style={{ backgroundColor: currentUser.color }} />
          </div>
        )}
        {/* Remote collaborators */}
        {users.map((u) => (
          <div key={u.clientId} className="presence__user">
            <Avatar name={u.name} color={u.color} size="sm" />
            <div className="presence__user-info">
              <div className="presence__user-name">{u.name}</div>
              <div className="presence__user-status">
                {u.cursor ? 'Editing' : 'Viewing'}
              </div>
            </div>
            <span className="presence__user-dot" style={{ backgroundColor: u.color }} />
          </div>
        ))}
      </div>
    </div>
  );
}
