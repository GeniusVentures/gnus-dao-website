/**
 * Tests for useToast hook
 */
import { renderHook, act } from '@testing-library/react';
import { useToast } from '@/hooks/useToast';

describe('useToast', () => {
	it('should initialize with empty toasts', () => {
		const { result } = renderHook(() => useToast());
		expect(result.current.toasts).toEqual([]);
	});

	it('should add a success toast', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.success('Success!', 'Operation completed');
		});

		expect(result.current.toasts).toHaveLength(1);
		expect(result.current.toasts[0]).toMatchObject({
			type: 'success',
			title: 'Success!',
			message: 'Operation completed',
		});
	});

	it('should add an error toast', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.error('Error!', 'Something went wrong');
		});

		expect(result.current.toasts).toHaveLength(1);
		expect(result.current.toasts[0]).toMatchObject({
			type: 'error',
			title: 'Error!',
			message: 'Something went wrong',
		});
	});

	it('should add a warning toast', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.warning('Warning!', 'Please be careful');
		});

		expect(result.current.toasts).toHaveLength(1);
		expect(result.current.toasts[0]).toMatchObject({
			type: 'warning',
			title: 'Warning!',
			message: 'Please be careful',
		});
	});

	it('should add an info toast', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.info('Info', 'Here is some information');
		});

		expect(result.current.toasts).toHaveLength(1);
		expect(result.current.toasts[0]).toMatchObject({
			type: 'info',
			title: 'Info',
			message: 'Here is some information',
		});
	});

	it('should add multiple toasts', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.success('First');
			result.current.error('Second');
			result.current.warning('Third');
		});

		expect(result.current.toasts).toHaveLength(3);
	});

	it('should remove a toast by id', () => {
		const { result } = renderHook(() => useToast());

		let toastId: string;

		act(() => {
			toastId = result.current.success('Test');
		});

		expect(result.current.toasts).toHaveLength(1);

		act(() => {
			result.current.removeToast(toastId);
		});

		expect(result.current.toasts).toHaveLength(0);
	});

	it('should generate unique IDs for toasts', () => {
		const { result } = renderHook(() => useToast());

		let id1: string, id2: string;

		act(() => {
			id1 = result.current.success('First');
			id2 = result.current.success('Second');
		});

		expect(id1).not.toBe(id2);
	});

	it('should handle custom duration', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.success('Test', 'Message', 5000);
		});

		expect(result.current.toasts[0]?.duration).toBe(5000);
	});

	it('should add toast without message', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.success('Title only');
		});

		expect(result.current.toasts[0]).toMatchObject({
			type: 'success',
			title: 'Title only',
			message: undefined,
		});
	});

	it('should include onClose callback in toast', () => {
		const { result } = renderHook(() => useToast());

		act(() => {
			result.current.success('Test');
		});

		expect(result.current.toasts[0]?.onClose).toBeDefined();
		expect(typeof result.current.toasts[0]?.onClose).toBe('function');
	});
});
