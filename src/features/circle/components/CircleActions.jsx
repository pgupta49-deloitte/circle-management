import { useState } from 'react';
import { useAppData } from '../../../app/useAppData.js';

function getActionError(error, action) {
  if (error.status) return error.message;
  return `Couldn't ${action} locally. Check storage and try again.`;
}

export function AddToCircleButton({ userId }) {
  const { memberships, addToCircle } = useAppData();
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const membership = memberships.find((item) => item.userId === userId);

  async function handleAdd() {
    setIsAdding(true);
    setErrorMessage('');
    try {
      await addToCircle(userId);
    } catch (error) {
      setErrorMessage(getActionError(error, 'add this person'));
    } finally {
      setIsAdding(false);
    }
  }

  if (membership) {
    return (
      <span className={`member-tag${membership.pendingSync ? ' member-tag--pending' : ''}`}>
        <span aria-hidden="true">{membership.pendingSync ? '◷' : '✓'}</span>
        {membership.pendingSync ? 'Waiting to sync' : 'In your circle'}
      </span>
    );
  }

  return (
    <div className="circle-action">
      <button className="circle-button circle-button--add" type="button" onClick={handleAdd} disabled={isAdding}>
        <span aria-hidden="true">＋</span> {isAdding ? 'Adding…' : 'Add to Circle'}
      </button>
      {errorMessage && <p className="circle-action__error" role="alert">{errorMessage}</p>}
    </div>
  );
}

export function RemoveFromCircleButton({ membership }) {
  const { removeFromCircle } = useAppData();
  const [isRemoving, setIsRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleRemove() {
    setIsRemoving(true);
    setErrorMessage('');
    try {
      await removeFromCircle(membership);
    } catch (error) {
      setErrorMessage(getActionError(error, 'remove this person'));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="circle-action">
      <button className="circle-button circle-button--remove" type="button" onClick={handleRemove} disabled={isRemoving}>
        {isRemoving ? 'Removing…' : 'Remove'}
      </button>
      {errorMessage && <p className="circle-action__error" role="alert">{errorMessage}</p>}
    </div>
  );
}
