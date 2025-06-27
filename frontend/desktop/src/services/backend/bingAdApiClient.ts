export class BingAdApiClient {
  private bearerToken: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null = null;

  constructor(
    private tenant: string,
    private clientId: string,
    private clientSecret: string,
    private initialRefreshToken: string,
    private developerToken: string,
    private customerId: number,
    private customerAccountId: number,
    private conversionName: string
  ) {
    console.log('BingAdApiClient initialized with conversion:', conversionName);
  }

  public async refreshBearerToken() {
    console.log('Refreshing Bing Ads API bearer token...');

    const refreshToken = this.bearerToken?.refreshToken ?? this.initialRefreshToken;
    const scope = 'https://ads.microsoft.com/msads.manage offline_access';

    const tokenEndpoint = `https://login.microsoftonline.com/${this.tenant}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.clientId,
      scope,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString();

    const resp = (await (
      await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
      })
    ).json()) as
      | {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        }
      | {
          error: string;
          error_description: string;
          error_codes: number[];
        };

    if ('error' in resp) {
      throw new Error(
        `Failed to refresh Bing Ads API token: ${resp.error} - ${resp.error_description}`
      );
    }

    this.bearerToken = {
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      expiresAt: Date.now() + resp.expires_in * 1000
    };
  }

  public async applyOfflineConversion(conversion: { name: string; time: Date; clickId: string }) {
    // Refresh the token if it's not set or about to expire (20 minutes before expiration)
    if (!this.bearerToken || Date.now() >= this.bearerToken.expiresAt - 20 * 60 * 1000) {
      await this.refreshBearerToken();
    }

    const endpoint =
      'https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/OfflineConversions/Apply';

    const body = {
      OfflineConversions: [
        {
          ConversionName: this.conversionName,
          ConversionTime: conversion.time.toISOString(),
          MicrosoftClickId: conversion.clickId
        }
      ]
    };

    const resp = (await (
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.bearerToken!.accessToken}`,
          DeveloperToken: this.developerToken,
          CustomerId: this.customerId.toString(),
          CustomerAccountId: this.customerAccountId.toString()
        },
        body: JSON.stringify(body)
      })
    ).json()) as
      | { PartialErrors: Array<{ Code: number; Message: string; ErrorCode: string }> }
      | { Errors: Array<{ Code: number; Message: string; ErrorCode: string }> };

    if ('Errors' in resp) {
      throw new Error(
        `Failed to apply Bing AD offline conversion: ` +
          resp.Errors.map((e) => `${e.Code}: ${e.Message}`).join('\n')
      );
    }

    return resp;
  }
}
