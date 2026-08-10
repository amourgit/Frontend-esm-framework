/** @module @category UI */
import React, { useCallback, useEffect, useState } from 'react';
import type { Subject } from 'rxjs';
import type { ToastNotificationMeta } from './toast.component';
import { Toast } from './toast.component';

interface ActiveToastsProps {
  subject: Subject<ToastNotificationMeta>;
}

const ActiveToasts: React.FC<ActiveToastsProps> = ({ subject }) => {
  const [toasts, setToasts] = useState<Array<ToastNotificationMeta>>([]);

  const closeToast = useCallback((toast) => {
    setToasts((toasts) => toasts.filter((t) => t !== toast));
  }, []);

  useEffect(() => {
    const subscription = subject.subscribe((toast) =>
      setToasts((toasts) => [
        ...toasts.filter((t) =>
          toast.toastKey
            ? // Identité stable explicite (nouveau, additif) : remplace le toast
              // portant la même toastKey — permet des mises à jour en temps réel
              // (ex. barre de progression) sans empiler de nouvelles instances.
              t.toastKey !== toast.toastKey
            : // Comportement historique inchangé : dédoublonnage par contenu.
              t.description !== toast.description ||
              t.kind !== toast.kind ||
              t.title !== toast.title ||
              t.actionButtonLabel !== toast.actionButtonLabel ||
              t.onActionButtonClick !== toast.onActionButtonClick,
        ),
        toast,
      ]),
    );

    return () => subscription.unsubscribe();
  }, [subject]);

  return (
    <>
      {toasts.map((toast) => (
        <Toast key={toast.toastKey ?? toast.id} toast={toast} closeToast={() => closeToast(toast)} />
      ))}
    </>
  );
};

export default ActiveToasts;
