import yaml from 'js-yaml';
import { DBCreatePatchYamlMap, DBTypeEnum, getDBCreatePatchYamls } from '@/constants/db';

describe('DBCreatePatchYamlMap', () => {
  it('builds PostgreSQL create patches that remove bg_mon', () => {
    const parsed = yaml.load(getDBCreatePatchYamls(DBTypeEnum.postgresql, 'pg-prod')[0]) as any;

    expect(parsed).toMatchObject({
      apiVersion: 'apps.kubeblocks.io/v1alpha1',
      kind: 'OpsRequest',
      metadata: {
        generateName: 'pg-prod-disable-bg-mon-'
      },
      spec: {
        type: 'Reconfiguring',
        clusterName: 'pg-prod',
        force: false,
        reconfigure: {
          componentName: 'postgresql',
          configurations: [
            {
              name: 'postgresql-configuration',
              keys: [
                {
                  key: 'postgresql.conf',
                  parameters: [
                    {
                      key: 'shared_preload_libraries',
                      value:
                        "'pg_stat_statements,auto_explain,pgextwlist,pg_auth_mon,set_user,pg_cron,pg_stat_kcache,timescaledb,pgaudit'"
                    }
                  ]
                }
              ]
            }
          ]
        },
        preConditionDeadlineSeconds: 0
      }
    });
  });

  it('infers patch keys as database types', () => {
    expect(Object.keys(DBCreatePatchYamlMap)).toEqual([DBTypeEnum.postgresql]);
  });
});
