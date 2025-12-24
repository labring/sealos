import appIcon from '@/assets/app-icons/app.svg';
import cvmIcon from '@/assets/app-icons/cvm.svg';
import dbIcon from '@/assets/app-icons/db.svg';
import jobIcon from '@/assets/app-icons/job.svg';
import osIcon from '@/assets/app-icons/objectstorage.svg';
import sealosIcon from '@/assets/sealos.svg';
import terminalIcon from '@/assets/app-icons/terminal.svg';
import { Avatar, AvatarFallback, AvatarImage } from '@sealos/shadcn-ui/avatar';
import { cn } from '@sealos/shadcn-ui';
import { AppType } from '@/types/app';

export function AppIcon({
  app,
  className
}: {
  app: string;
  className?: {
    avatar?: string;
    fallback?: string;
    image?: string;
  };
}) {
  let uri = '';
  if (app === AppType.DB) {
    uri = dbIcon.src;
  } else if (app === AppType.APP) {
    uri = appIcon.src;
  } else if (app === AppType.TERMINAL) {
    uri = terminalIcon.src;
  } else if (app === AppType.JOB) {
    uri = jobIcon.src;
  } else if (app === AppType.OBJECT_STORAGE) {
    uri = osIcon.src;
  } else if (app === AppType.CLOUD_VM) {
    uri = cvmIcon.src;
  } else {
    uri = sealosIcon.src;
  }

  return (
    <Avatar className={cn('rounded-sm', className?.avatar)}>
      <AvatarFallback className={cn(className?.avatar)}>
        {app.charAt(0).toUpperCase()}
      </AvatarFallback>
      <AvatarImage src={uri} className={cn(className?.avatar)} />
    </Avatar>
  );
}
