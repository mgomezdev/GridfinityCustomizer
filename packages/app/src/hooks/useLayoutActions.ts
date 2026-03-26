import { useCallback, useRef } from 'react';
import type { LayoutStatus } from '@gridfinity/shared';
import type { DialogAction } from '../reducers/dialogReducer';
import type {
  useSubmitLayoutMutation,
  useWithdrawLayoutMutation,
  useCloneLayoutMutation,
} from './useLayouts';

interface UseLayoutActionsParams {
  layoutId: number | null;
  submitLayoutMutation: ReturnType<typeof useSubmitLayoutMutation>;
  withdrawLayoutMutation: ReturnType<typeof useWithdrawLayoutMutation>;
  cloneLayoutMutation: ReturnType<typeof useCloneLayoutMutation>;
  handleSetStatus: (status: LayoutStatus | null) => void;
  handleCloneComplete: (id: number, name: string, status: LayoutStatus) => void;
  rawHandleSaveComplete: (layoutId: number, name: string, status: LayoutStatus) => void;
  dialogDispatch: React.Dispatch<DialogAction>;
}

export function useLayoutActions({
  layoutId,
  submitLayoutMutation,
  withdrawLayoutMutation,
  cloneLayoutMutation,
  handleSetStatus,
  handleCloneComplete,
  rawHandleSaveComplete,
  dialogDispatch,
}: UseLayoutActionsParams) {
  const submitAfterSaveRef = useRef(false);

  const handleSubmitLayout = useCallback(async () => {
    if (!layoutId) return;
    try {
      const result = await submitLayoutMutation.mutateAsync(layoutId);
      handleSetStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutId, submitLayoutMutation, handleSetStatus]);

  const handleSubmitClick = useCallback(() => {
    if (!layoutId) {
      submitAfterSaveRef.current = true;
      dialogDispatch({ type: 'OPEN', dialog: 'save' });
    } else {
      void handleSubmitLayout();
    }
  }, [layoutId, dialogDispatch, handleSubmitLayout]);

  const handleSaveComplete = useCallback((id: number, name: string, status: LayoutStatus) => {
    rawHandleSaveComplete(id, name, status);
    if (submitAfterSaveRef.current) {
      submitAfterSaveRef.current = false;
      submitLayoutMutation.mutate(id, {
        onSuccess: (result) => handleSetStatus(result.status),
      });
    }
  }, [rawHandleSaveComplete, submitLayoutMutation, handleSetStatus]);

  const handleWithdrawLayout = useCallback(async () => {
    if (!layoutId) return;
    try {
      const result = await withdrawLayoutMutation.mutateAsync(layoutId);
      handleSetStatus(result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutId, withdrawLayoutMutation, handleSetStatus]);

  const handleCloneCurrentLayout = useCallback(async () => {
    if (!layoutId) return;
    try {
      const result = await cloneLayoutMutation.mutateAsync(layoutId);
      handleCloneComplete(result.id, result.name, result.status);
    } catch {
      // Error handled by mutation
    }
  }, [layoutId, cloneLayoutMutation, handleCloneComplete]);

  return {
    handleSubmitLayout,
    handleSubmitClick,
    handleSaveComplete,
    handleWithdrawLayout,
    handleCloneCurrentLayout,
  };
}
