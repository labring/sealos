'use client';

import React from 'react';
import { TriangleAlertIcon } from 'lucide-react';
import type { ExceededWorkspaceQuotaItem, WorkspaceQuotaItemType } from '../../../types/workspace';
import { resourcePropertyMap } from '../../../constants/resource';
import { getQuotaDialogI18n, type SupportedLang } from '../../../i18n/quota-dialog';

export interface InsufficientQuotaDialogViewProps {
  items: ExceededWorkspaceQuotaItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onOpenCostCenter: () => void;
  showControls: boolean;
  showRequirements: WorkspaceQuotaItemType[];
  lang: SupportedLang;
}

export function InsufficientQuotaDialogView({
  items,
  open,
  onOpenChange,
  onConfirm,
  showControls,
  onOpenCostCenter,
  showRequirements,
  lang
}: InsufficientQuotaDialogViewProps) {
  const i18n = getQuotaDialogI18n(lang);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-[800px] rounded-2xl border bg-white p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <TriangleAlertIcon className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">{i18n.title}</h2>
        </div>

        {/* Close button */}
        <button
          className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => onOpenChange(false)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span className="sr-only">Close</span>
        </button>

        {/* Body */}
        <div className="space-y-4">
          <div className="rounded-md bg-orange-50 p-4">
            <p className="text-sm">{i18n.alertTitle}</p>

            <hr className="my-5 border-dashed border-gray-300" />

            <div className="space-y-3">
              {items.map((item) => {
                const props = resourcePropertyMap[item.type];
                if (!props) return null;

                const showRequirement = showRequirements.includes(item.type) && !!item.request;

                return (
                  <div key={item.type} className="w-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-gray-400">
                        <props.icon size={20} />
                        <span className="font-medium text-gray-900">
                          {i18n.resourceLabels[item.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          {i18n.quotaTotal}
                          {(item.limit / props.scale).toFixed(2)} {props.unit}
                        </span>
                        <span className="h-4 w-px bg-gray-300" />
                        <span>
                          {i18n.quotaInUse}
                          {(item.used / props.scale).toFixed(2)} {props.unit}
                        </span>
                        <span className="h-4 w-px bg-gray-300" />
                        <span className={showRequirement ? '' : 'text-red-500'}>
                          {i18n.quotaAvailable}
                          {((item.limit - item.used) / props.scale).toFixed(2)} {props.unit}
                        </span>
                        {showRequirement && (
                          <>
                            <span className="h-4 w-px bg-gray-300" />
                            <span className="text-red-500">
                              {i18n.quotaRequired}
                              {(item.request! / props.scale).toFixed(2)} {props.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm">
            <span>{i18n.pleaseUpgradePlan.prefix}</span>
            <span
              className="cursor-pointer font-semibold text-blue-600 underline"
              onClick={onOpenCostCenter}
            >
              {i18n.pleaseUpgradePlan.link}
            </span>
            <span>{i18n.pleaseUpgradePlan.suffix}</span>
          </p>
        </div>

        {/* Footer */}
        {showControls && (
          <div className="mt-6 flex justify-end gap-3">
            <button
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              {i18n.cancel}
            </button>
            <button
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              onClick={onConfirm}
            >
              {i18n.confirm}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
