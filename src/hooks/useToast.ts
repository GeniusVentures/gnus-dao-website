'use client';

import { useState, useCallback } from 'react';
import { ToastProps, ToastType } from '@/components/ui/Toast';

let toastId = 0;

export function useToast() {
	const [toasts, setToasts] = useState<ToastProps[]>([]);

	const addToast = useCallback(
		(type: ToastType, title: string, message?: string, duration?: number) => {
			const id = `toast-${++toastId}`;
			const newToast: ToastProps = {
				id,
				type,
				title,
				message,
				duration,
				onClose: (id: string) => removeToast(id),
			};

			setToasts((prev) => [...prev, newToast]);
			return id;
		},
		[],
	);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const success = useCallback(
		(title: string, message?: string, duration?: number) => {
			return addToast('success', title, message, duration);
		},
		[addToast],
	);

	const error = useCallback(
		(title: string, message?: string, duration?: number) => {
			return addToast('error', title, message, duration);
		},
		[addToast],
	);

	const warning = useCallback(
		(title: string, message?: string, duration?: number) => {
			return addToast('warning', title, message, duration);
		},
		[addToast],
	);

	const info = useCallback(
		(title: string, message?: string, duration?: number) => {
			return addToast('info', title, message, duration);
		},
		[addToast],
	);

	return {
		toasts,
		addToast,
		removeToast,
		success,
		error,
		warning,
		info,
	};
}
