import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner
} from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import styles from './delete_dialog.module.scss';
import Image from 'next/image';
import request from 'services/request';
import useSessionStore from 'stores/session';

type DialogComponentProps = {
  open: boolean;
  deleteName: string;
  onChangeOpen: (open: boolean) => void;
};
enum DialogStatus {
  loading,
  success
}
export default function DeletePgsqlDialog(props: DialogComponentProps) {
  const { open, deleteName, onChangeOpen } = props;
  const [isDisabled, setIsDisabled] = useState(true);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [dialogStatus, setDialogStatus] = useState<DialogStatus>();
  const handleDelete = async () => {
    onChangeOpen(false);
    setDialogStatus(DialogStatus.loading);
    const res = await request.post('/api/pgsql/deletePgsql', { pgsqlName: deleteName, kubeconfig });
    const deleteComplete = res.data.body.status === 'Success' ? true : false;
    let fresh = false;
    while (!fresh && deleteComplete) {
      const all = await request.post('/api/pgsql/getAll', { kubeconfig });
      const isFind = all.data?.items.find((item: any) => {
        item.metadata.name === deleteName;
      });
      if (!isFind) {
        fresh = true;
      }
    }
    setDialogStatus(DialogStatus.success);
    setTimeout(() => {
      setDialogStatus(undefined);
    }, 1000);
  };

  useEffect(() => {
    setIsDisabled(true);
  }, [deleteName]);

  return (
    <div>
      <div>
        <Dialog modalType="alert" open={open}>
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
                <Button className={styles.cancelBtn} onClick={() => onChangeOpen(false)}>
                  取消
                </Button>
                <Button className={styles.confirmBtn} onClick={handleDelete} disabled={isDisabled}>
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
            <DialogBody>
              <DialogContent>
                <Spinner size="small" label="删除中" />
              </DialogContent>
            </DialogBody>
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
