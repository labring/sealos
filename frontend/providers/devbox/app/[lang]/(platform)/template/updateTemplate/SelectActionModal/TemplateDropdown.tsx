'use client';

import Image from 'next/image';
import { Check, ChevronDownIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TemplateButtonProps {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
  isInMenu?: boolean;
  description: string;
  onClick?: () => void;
  className?: string;
}

const TemplateButton = ({
  isActive = false,
  icon,
  title,
  description,
  onClick,
  isInMenu = false,
  className,
  ...props
}: TemplateButtonProps) => {
  return (
    <Button
      variant="outline"
      className={cn(
        'relative h-[74px] w-[400px] bg-[#F7F8FA] p-0',
        isActive && 'border-primary text-primary ring-[2.4px] ring-primary/15',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="absolute top-1/2 left-4 flex -translate-y-1/2 items-center gap-3">
        <div className="h-8 w-8">{icon}</div>
        <div className="h-10 w-[200px]">
          <p
            className={cn(
              'w-[200px] overflow-hidden text-left text-base leading-6 font-medium tracking-[0.15px] text-ellipsis whitespace-nowrap',
              isActive ? 'text-primary' : 'text-[#111824]'
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'w-auto overflow-hidden text-left text-xs leading-4 tracking-[0.004em] text-ellipsis whitespace-nowrap',
              isActive ? 'text-primary' : 'text-[#667085]'
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {!isActive && !isInMenu && (
        <ChevronDownIcon className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-[#667085]" />
      )}
      {isActive && (
        <Check className="absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 text-primary" />
      )}
    </Button>
  );
};

type TRepositoryItem = {
  iconId: string | null;
  name: string;
  description: string | null;
  uid: string;
};

export default function TemplateDropdown({
  templateRepositoryList,
  selectedTemplateRepoUid,
  setSelectedTemplateRepoUid
}: {
  templateRepositoryList: TRepositoryItem[];
  selectedTemplateRepoUid: string | null;
  setSelectedTemplateRepoUid: (uid: string) => void;
}) {
  const selectedTemplateRepository = templateRepositoryList.find(
    (t) => t.uid === selectedTemplateRepoUid
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="w-[400px]">
          <TemplateButton
            className="select-none"
            isActive={false}
            icon={
              <Image
                src={`/images/${selectedTemplateRepository?.iconId || ''}.svg`}
                width={32}
                height={32}
                alt={selectedTemplateRepository?.name || ''}
              />
            }
            title={selectedTemplateRepository?.name || ''}
            description={selectedTemplateRepository?.description || ''}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-3" align="start">
        <div className="flex flex-col gap-2">
          {templateRepositoryList.map(({ uid, iconId, description, name }) => (
            <TemplateButton
              key={uid}
              className="w-full"
              isActive={selectedTemplateRepoUid === uid}
              icon={<Image src={`/images/${iconId}.svg`} width={32} height={32} alt={name} />}
              isInMenu
              title={name}
              description={description || ''}
              onClick={() => setSelectedTemplateRepoUid(uid)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
