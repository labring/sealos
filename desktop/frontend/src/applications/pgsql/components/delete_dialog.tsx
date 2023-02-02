import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner
} from '@fluentui/react-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import Button from './button';
import styles from './delete_dialog.module.scss';

type DialogComponentProps = {
  isOpen: boolean;
  deleteName: string;
  onOpen: (open: boolean) => void;
};

enum DialogStatus {
  loading,
  success
}

export default function DeletePgsqlDialog(props: DialogComponentProps) {
  const { isOpen, deleteName, onOpen } = props;
  const [isDisabled, setIsDisabled] = useState(true);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>();
  const queryClient = useQueryClient();

  const pgsqlMutation = useMutation({
    mutationFn: () => {
      return request.post('/api/pgsql/deletePgsql', { pgsqlName: deleteName, kubeconfig });
    },
    onSuccess: () => {
      setDialogStatus(DialogStatus.success);
      queryClient.invalidateQueries(['getAllPgsql']);
    },
    onSettled: () => {
      onOpen(false);
      setDialogStatus(undefined);
    }
  });

  const handleDelete = async () => {
    if (isDisabled) {
      return;
    }
    setDialogStatus(DialogStatus.loading);
    pgsqlMutation.mutate();
  };

  useEffect(() => {
    setIsDisabled(true);
  }, [deleteName]);

  return (
    <div>
      <div>
        <Dialog modalType="alert" open={isOpen}>
          <DialogSurface>
            <DialogBody>
              <DialogTitle className={styles.dialogTitle}>确认要删除集群吗？ </DialogTitle>
              <DialogContent className={styles.dialogTitle}>
                <div>
                  确认要删除这个集群吗？如果删除，请在下方输入「 {props.deleteName}
                  」并点击删除集群按钮
                </div>
                <div className={styles.dialogInputBox}>
                  <input
                    type="text"
                    className={styles.dialogInput}
                    onChange={(e) => {
                      if (e.target.value === props.deleteName) {
                        setIsDisabled(false);
                      }
                    }}
                  />
                </div>
              </DialogContent>
              <DialogActions className="mt-2">
                <Button size="small" type="lightBlue" handleClick={() => onOpen(false)}>
                  取消
                </Button>
                <Button size="medium" plain disabled={isDisabled} handleClick={handleDelete}>
                  删除集群
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>

      <div>
        <Dialog open={dialogStatus === DialogStatus.loading}>
          <DialogSurface className={styles.loading}>
            <Spinner size="small" label="删除中" />
          </DialogSurface>
        </Dialog>
      </div>

      <div>
        <Dialog open={dialogStatus === DialogStatus.success}>
          <DialogSurface className={styles.loading}>
            <DialogBody>
              <DialogContent className={styles.doneContent}>
                <Image src="/images/pgsql/success_filled.svg" alt="pgsql" width={24} height={24} />
                <div className="ml-2">已删除</div>
              </DialogContent>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    </div>
  );
}
