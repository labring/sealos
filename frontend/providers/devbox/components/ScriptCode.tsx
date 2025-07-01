'use client';

import { useState } from 'react';
import { ChevronRight, Copy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCopyData } from '@/utils/tools';

import Code from './Code';
import { Button } from '@/components/ui/button';

interface ScriptCodeProps {
  platform: string;
  script: string;
  defaultOpen?: boolean;
  oneLine?: boolean;
  className?: string;
}

const ScriptCode = ({
  platform,
  script,
  defaultOpen = false,
  oneLine = false,
  className
}: ScriptCodeProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { copyData } = useCopyData();

  return (
    <div
      className={cn(
        'relative flex max-h-[300px] w-[585px] flex-col rounded-lg border border-input bg-background',
        oneLine && 'flex-row',
        className
      )}
    >
      <div className={cn('flex w-full items-center', !oneLine && 'justify-between')}>
        {!oneLine && (
          <Button
            variant="ghost"
            className="gap-2 font-normal hover:bg-transparent hover:text-primary"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronRight
              className={cn('h-4 w-4 text-muted-foreground transition-transform', {
                'rotate-90': isOpen
              })}
            />
            {platform === 'Windows' ? 'PowerShell' : 'Bash'}
          </Button>
        )}
        {oneLine && (
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-transparent hover:text-primary"
          onClick={() => copyData(script)}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {!oneLine && isOpen && (
        <div className="overflow-y-auto px-3 pt-2">
          <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
        </div>
      )}
    </div>
  );
};

export default ScriptCode;
