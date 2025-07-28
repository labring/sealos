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
        'relative flex max-h-[300px] w-full flex-col overflow-hidden rounded-lg border bg-white p-3',
        className
      )}
    >
      <div className="flex w-full items-center justify-between">
        {!oneLine && (
          <Button
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            className="hover:text-zinc-80 h-fit px-0 text-xs text-zinc-900 hover:bg-white has-[>svg]:p-0"
          >
            <ChevronRight
              className={cn('h-4 w-4 text-zinc-400 transition-transform duration-300', {
                'rotate-90': isOpen
              })}
            />
            {platform === 'Windows' ? 'PowerShell' : 'Bash'}
          </Button>
        )}
        {oneLine && (
          <div className="min-w-0 flex-1">
            <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => copyData(script)}
          className="h-full w-fit shrink-0 hover:bg-white hover:text-zinc-200"
        >
          <Copy className="h-4 w-4 text-zinc-400" />
        </Button>
      </div>
      {!oneLine && isOpen && (
        <div className="min-w-0 overflow-x-auto">
          <Code content={script} language={platform === 'Windows' ? 'powershell' : 'bash'} />
        </div>
      )}
    </div>
  );
};

export default ScriptCode;
