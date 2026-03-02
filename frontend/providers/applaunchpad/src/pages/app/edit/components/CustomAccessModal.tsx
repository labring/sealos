import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRequest } from '@/hooks/useRequest';
import { postAuthCname, postAuthDomainChallenge } from '@/api/platform';
import {
  DOMAIN_BINDING_DOCUMENTATION_LINK,
  DOMAIN_REG_QUERY_LINK,
  INFRASTRUCTURE_PROVIDER,
  REQUIRES_DOMAIN_REG,
  SEALOS_USER_DOMAINS
} from '@/store/static';
import NextLink from 'next/link';
import { BookOpen, CheckCircle, Copy, Loader2 } from 'lucide-react';
import { DomainNotBoundModal } from './DomainNotBoundModal';
import { useCopyData } from '@/utils/tools';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter
} from '@sealos/shadcn-ui/drawer';
import { Button } from '@sealos/shadcn-ui/button';
import { Input } from '@sealos/shadcn-ui/input';
import { Badge } from '@sealos/shadcn-ui/badge';
import { Alert, AlertDescription } from '@sealos/shadcn-ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@sealos/shadcn-ui/table';
import { Separator } from '@sealos/shadcn-ui/separator';

export type CustomAccessModalParams = {
  publicDomain: string;
  currentCustomDomain: string;
  domain: string;
};

const CustomAccessModal = ({
  publicDomain,
  currentCustomDomain,
  domain,
  onClose,
  onSuccess
}: CustomAccessModalParams & { onClose: () => void; onSuccess: (e: string) => void }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();

  const [notBoundOpen, setNotBoundOpen] = useState(false);

  const [processPhase, setProcessPhase] = useState<'INPUT_DOMAIN' | 'VERIFY_DOMAIN' | 'SUCCESS'>(
    'INPUT_DOMAIN'
  );
  const [customDomain, setCustomDomain] = useState(currentCustomDomain);
  const [previousState, setPreviousState] = useState<{
    domain: string;
    phase: 'INPUT_DOMAIN' | 'VERIFY_DOMAIN' | 'SUCCESS';
  } | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'CNAME' | 'HTTP_CHALLENGE'>('CNAME');
  const [proxyDetected, setProxyDetected] = useState<{
    isProxy: boolean;
    proxyType?: string;
    details?: any;
  }>({ isProxy: false });

  const sanitizeDomain = (input: string) =>
    input.match(/((?!-)[a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,6}/i)?.[0];

  // Check if domain is an internal domain (any SEALOS_USER_DOMAINS)
  const isInternalDomain = (domain: string): boolean => {
    if (!domain) return false;
    const normalizedDomain = domain.toLowerCase().trim();

    // Check against all user domains
    for (const userDomain of SEALOS_USER_DOMAINS) {
      const userDomainLower = userDomain.name.toLowerCase();
      if (
        normalizedDomain === userDomainLower ||
        normalizedDomain.endsWith(`.${userDomainLower}`)
      ) {
        return true;
      }
    }

    return false;
  };

  const isValidDomain = useMemo(() => {
    return !!sanitizeDomain(customDomain);
  }, [customDomain]);

  const { mutate: authDomain, isLoading } = useRequest({
    mutationFn: async (silent: boolean) => {
      let cnameResult = await postAuthCname({
        publicDomain: completePublicDomain,
        customDomain: customDomain
      }).catch((error) => {
        return {
          error
        };
      });
      if (!cnameResult?.error) {
        return {
          error: null,
          customDomain,
          silent,
          method: 'CNAME'
        };
      }
      setVerificationMethod('HTTP_CHALLENGE');

      const challengeResult = await postAuthDomainChallenge({
        customDomain: customDomain
      });
      console.log('challengeResult', challengeResult);

      return {
        error: challengeResult?.verified ? null : cnameResult?.error,
        customDomain,
        silent,
        method: challengeResult?.verified ? 'HTTP_CHALLENGE' : 'CNAME',
        cnameResult: cnameResult,
        challengeResult: challengeResult
      };
    },
    onSuccess: (data) => {
      console.log('data', data);
      if (data?.error) {
        if (!data?.silent) {
          let errorMessage = '';
          if (data?.method === 'HTTP_CHALLENGE' && data?.challengeError) {
            errorMessage =
              t('domain_challenge_verify_failed_toast') +
              ': ' +
              (data?.challengeError?.error?.message ??
                data?.challengeError?.message ??
                data?.challengeError);
          } else {
            errorMessage =
              t('domain_cname_verify_failed_toast') +
              ': ' +
              (data?.error?.error?.message ?? data?.error?.message ?? data?.error);
          }

          toast.error(errorMessage);
        }

        return;
      }

      console.log(`Domain verification successful using ${data.method} method`);

      // Handle proxy detection for HTTP challenge method
      if (data.method === 'HTTP_CHALLENGE' && data.challengeResult?.data?.proxy) {
        setProxyDetected(data.challengeResult.data.proxy);
      }

      onSuccess(data.customDomain);
      setProcessPhase('SUCCESS');
    }
  });

  useEffect(() => {
    if (processPhase === 'VERIFY_DOMAIN') {
      const interval = setInterval(() => {
        authDomain(undefined);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [processPhase, authDomain]);

  const completePublicDomain = useMemo(() => `${publicDomain}.${domain}`, [publicDomain, domain]);

  const handleClose = () => {
    if (
      processPhase !== 'SUCCESS' &&
      // Do not open the warning modal if not touched.
      customDomain !== currentCustomDomain
    ) {
      setNotBoundOpen(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Drawer open onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent direction="right" className="min-w-[560px] sm:max-w-[560px]">
          <DrawerHeader>
            <DrawerTitle>{t('Custom Domain')}</DrawerTitle>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Domain Input */}
            <div>
              <h3 className="font-semibold text-lg text-zinc-900 mb-2">
                {t('custom_domain_input_title')}
              </h3>

              {/* Tips */}
              {REQUIRES_DOMAIN_REG ? (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-zinc-600">
                    {t('domain_requires_registration_tip_1')}
                    <span className="font-semibold">
                      {t('infrastructure.providers.' + INFRASTRUCTURE_PROVIDER + '.name')}
                    </span>
                    {t('domain_requires_registration_tip_2')}
                  </p>

                  <div className="flex items-center gap-2 h-6">
                    <NextLink
                      target="_blank"
                      className="text-sm text-blue-600 hover:underline"
                      href={t(
                        'infrastructure.providers.' + INFRASTRUCTURE_PROVIDER + '.domain_reg_link'
                      )}
                    >
                      {t('domain_registration_provider_link_text')}
                    </NextLink>

                    <Separator orientation="vertical" className="h-4" />

                    <NextLink
                      target="_blank"
                      className="text-sm text-blue-600 hover:underline"
                      href={DOMAIN_REG_QUERY_LINK}
                    >
                      {t('domain_registration_query_link_text')}
                    </NextLink>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 mb-4">{t('domain_input_tip')}</p>
              )}

              {/* Your Domain */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 mr-2">
                  <Input
                    value={customDomain}
                    onChange={(e) => {
                      if (processPhase === 'INPUT_DOMAIN') {
                        const normalizedDomain = e.target.value.trim().toLowerCase();
                        setCustomDomain(normalizedDomain);
                      }
                    }}
                    className="h-10 bg-white pr-32 rounded-lg"
                    readOnly={processPhase !== 'INPUT_DOMAIN'}
                    placeholder={t('Input your custom domain') || 'Input your custom domain'}
                  />

                  {processPhase !== 'INPUT_DOMAIN' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {processPhase === 'VERIFY_DOMAIN' && (
                        <Badge
                          variant="outline"
                          className="bg-red-50 border-[0.5px] border-red-200 text-red-600 rounded-full px-2"
                        >
                          {t('domain_verification_needed')}
                        </Badge>
                      )}
                      {processPhase === 'SUCCESS' && (
                        <Badge
                          variant="outline"
                          className="bg-green-50 border-[0.5px] border-green-200 text-green-600 rounded-full px-2"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>{t('domain_verified')}</span>
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {processPhase === 'INPUT_DOMAIN' ? (
                  <>
                    {currentCustomDomain && !previousState && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomDomain('');
                          onSuccess('');
                          onClose();
                        }}
                        className="h-10 text-sm font-medium px-4 rounded-lg shadow-none hover:bg-zinc-50"
                      >
                        {t('domain_verification_input_clear')}
                      </Button>
                    )}

                    <Button
                      disabled={!isValidDomain}
                      onClick={() => {
                        const sanitizedDomain = sanitizeDomain(customDomain);
                        if (sanitizedDomain) {
                          // Check if domain is an internal domain first
                          if (isInternalDomain(sanitizedDomain)) {
                            toast.error(t('domain_cannot_use_internal'));
                            return;
                          }

                          setCustomDomain(sanitizedDomain);
                          setProcessPhase('VERIFY_DOMAIN');
                          setVerificationMethod('CNAME'); // Reset to try CNAME first
                          setPreviousState(null);
                          authDomain(true);
                        }
                      }}
                      className="h-10 text-sm font-medium px-4 rounded-lg shadow-none"
                    >
                      {t('domain_verification_input_save')}
                    </Button>

                    {previousState && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCustomDomain(previousState.domain);
                          setProcessPhase(previousState.phase);
                          setPreviousState(null);
                        }}
                        className="h-10 text-sm font-medium px-4 rounded-lg shadow-none hover:bg-zinc-50"
                      >
                        {t('Cancel')}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => authDomain(false)}
                      disabled={isLoading}
                      className="h-10 text-sm font-medium px-4 rounded-lg shadow-none hover:bg-zinc-50"
                    >
                      {isLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                      {t('domain_verification_refresh')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPreviousState({
                          domain: customDomain,
                          phase: processPhase
                        });
                        setProcessPhase('INPUT_DOMAIN');
                      }}
                      disabled={isLoading}
                      className="h-10 text-sm font-medium px-4 rounded-lg shadow-none hover:bg-zinc-50"
                    >
                      {t('domain_verification_input_edit')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* DNS Records */}
            {processPhase !== 'INPUT_DOMAIN' && (
              <div className="p-4 border border-dashed border-zinc-400 rounded-xl space-y-4">
                <div className="space-y-2">
                  <h4 className="text-base font-semibold text-zinc-900">
                    {t('domain_verification_dns_records')}
                  </h4>

                  <p className="text-sm text-zinc-900 font-normal">
                    {t('domain_verification_dns_records_tip_1')}
                    <span className="font-semibold">{completePublicDomain}</span>
                    {t('domain_verification_dns_records_tip_2')}
                  </p>
                </div>

                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
                  <Table className="[&_th]:h-auto [&_th]:py-2 [&_th]:font-semibold [&_th]:text-zinc-500 [&_th]:bg-white [&_th]:border-b [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-b [&_td]:border-r [&_td:last-child]:border-r-0 [&_tr:last-child_td]:border-b-0">
                    <TableHeader>
                      <TableRow className="">
                        <TableHead>{t('domain_verification_dns_records_type')}</TableHead>
                        <TableHead>{t('domain_verification_dns_records_ttl')}</TableHead>
                        <TableHead>{t('domain_verification_dns_records_value')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>{t('domain_verification_dns_records_type_cname')}</TableCell>
                        <TableCell>{t('domain_verification_dns_records_ttl_auto')}</TableCell>
                        <TableCell
                          className="cursor-pointer hover:bg-zinc-50 transition-colors"
                          onClick={() => copyData(completePublicDomain)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-zinc-900">{completePublicDomain}</span>
                            <Copy className="w-4 h-4 text-zinc-400" />
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Refer to docs */}
                {DOMAIN_BINDING_DOCUMENTATION_LINK && (
                  <NextLink
                    target="_blank"
                    href={DOMAIN_BINDING_DOCUMENTATION_LINK}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t('domain_verification_dns_records_docs_link_text')}</span>
                  </NextLink>
                )}
              </div>
            )}

            {/* Success */}
            {processPhase === 'SUCCESS' && (
              <div className="flex flex-col gap-3 sm:flex-col">
                <Alert className="w-full bg-green-50 border-green-500 border-[0.5px] flex items-center justify-center">
                  <AlertDescription className="text-green-600 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {t('domain_verification_success')}
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Proxy Detection Warning */}
                {proxyDetected.isProxy && (
                  <div className="w-full border-l-2 border-orange-300 px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-base font-medium text-orange-500 whitespace-pre-line">
                        {t('proxy_detected_title')}
                      </p>
                      <p className="text-sm text-orange-500 font-normal">
                        {t('proxy_detected_message')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <DomainNotBoundModal
        isOpen={notBoundOpen}
        onClose={() => setNotBoundOpen(false)}
        onConfirm={() => {
          setNotBoundOpen(false);
          onClose();
        }}
      />
    </>
  );
};

export default CustomAccessModal;
