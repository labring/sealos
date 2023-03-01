import clsx from 'clsx';
import MarkDown from 'components/markdown';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import styles from './add_page.module.scss';
import Button from './components/button';
import {
  ControlledDropdown,
  ControlledNumberField,
  ControlledTextField
} from './components/controlled_fluent';
import { PageType, usePgSqlContext } from './index';
import { generatePgsqlTemplate, TPgSqlForm } from './pgsql_common';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  Spinner
} from '@fluentui/react-components';

function AddPage() {
  const { toPage } = usePgSqlContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [yamlTemplate, setYamlTemplate] = useState('');
  const { currentApp } = useAppStore();

  const { handleSubmit, control, formState, watch, register, getValues } = useForm<TPgSqlForm>({
    defaultValues: {
      pgsqlName: '',
      version: '14',
      instance: '1',
      volumeSize: '1',
      iops: '3000',
      througput: '125',
      limits: {
        cpu: '300',
        memory: '300'
      },
      dataBases: [{ name: 'rootdb', user: 'root' }],
      users: [{ name: 'root', authority: 'superuser' }]
    },
    reValidateMode: 'onSubmit',
    mode: 'all'
  });

  const {
    fields: userArr,
    append,
    remove
  } = useFieldArray({ control, name: 'users', rules: { required: true } });
  const {
    fields: dataBaseArr,
    append: dataBaseAppend,
    remove: dataBaseRemove
  } = useFieldArray({ control, name: 'dataBases', rules: { required: true } });

  useEffect(() => {
    setYamlTemplate(generatePgsqlTemplate(formState.defaultValues));
  }, [formState.defaultValues]);

  watch((data: TPgSqlForm | any) => {
    setYamlTemplate(generatePgsqlTemplate(data));
  });

  const createPgsqlMutation = useMutation({
    mutationFn: (data: TPgSqlForm) => {
      return request.post('/api/pgsql/applyPgsql', { data, kubeconfig });
    },
    onSettled: () => {
      toPage(PageType.FrontPage);
    }
  });

  const onSave = () => {
    handleSubmit(
      (data) => {
        createPgsqlMutation.mutate(data);
      },
      (err) => {
        console.log(err);
      }
    )();
  };

  const copyYaml = () => {
    navigator.clipboard.writeText(yamlTemplate.slice(8, -4));
  };

  return (
    <div className={clsx(styles.pgsqlFrontPage, 'w-full h-full flex flex-col')}>
      <div
        className={clsx(
          'pb-4 pt-8 flex items-center',
          currentApp?.size === 'maxmin' ? 'px-8' : 'px-40'
        )}
      >
        <Button
          shape="squareRound"
          icon="/images/pgsql/detail_back.svg"
          handleClick={() => toPage(PageType.FrontPage)}
        />
        <div className={clsx(styles.title, 'ml-8')}>PostgreSQL 集群配置</div>
        <div className="ml-auto">
          <Button type="primary" handleClick={() => onSave()}>
            创建集群
          </Button>
        </div>
      </div>
      <div className={clsx('flex-1 flex', currentApp?.size === 'maxmin' ? 'mx-8' : 'mx-40')}>
        <div className={clsx(styles.pgsqlFormScroll, 'mt-6')}>
          <div className={clsx('w-full absolute pb-6')}>
            <div className={styles.cardName}>
              <div className={clsx('flex p-6')}>
                <div className="w-20 pt-4">
                  <span style={{ color: '#EC872A' }}>* </span>
                  Name
                </div>
                <div className={clsx(styles.inputName)}>
                  <ControlledTextField
                    control={control}
                    name="pgsqlName"
                    placeholder="postgreSQL cluster name ( 3-32 )"
                    validationMessage="必须以字母数字开头、结尾;只能包含小写字母、数字，以及 '-' 和 '.'"
                    rules={{
                      required: { value: true, message: 'this is required' },
                      pattern: {
                        value: /^[a-z0-9]+([-.][a-z0-9]+)*$/,
                        message: 'error message'
                      }
                    }}
                  />
                </div>
              </div>
              <div className="p-6 pt-0 flex">
                <div className="w-full">
                  <div className="mb-3">PostgreSQL version</div>
                  <ControlledDropdown
                    control={control}
                    name="version"
                    defaultValue={'14'}
                    options={[
                      { key: '14', content: '14' },
                      { key: '13', content: '13' },
                      { key: '12', content: '12' },
                      { key: '11', content: '11' },
                      { key: '10', content: '10' }
                    ]}
                  />
                </div>
                <div className="w-6"></div>
                <div className="w-full">
                  <div className="mb-3">Number of instance</div>
                  <ControlledNumberField control={control} name="instance" defaultValue={1} />
                </div>
              </div>
            </div>
            <div className={clsx(styles.cardUsers, 'mt-4')}>
              <div className="flex">
                <div>
                  <span style={{ color: '#EC872A' }}>*</span> Users
                </div>
                <div className="ml-auto">
                  <Button
                    size="mini"
                    type="lightBlue"
                    icon="/images/pgsql/add_blue.svg"
                    handleClick={() => {
                      append({ name: '', authority: undefined });
                    }}
                  ></Button>
                </div>
              </div>
              {userArr.map((item, index) => (
                <div className="flex items-center mt-3" key={item.id}>
                  <ControlledTextField
                    control={control}
                    name={`users.${index}.name`}
                    placeholder="user name"
                    rules={{ required: { value: true, message: 'this is required' } }}
                  />
                  <div className="w-6"></div>
                  <div className="w-full">
                    <ControlledDropdown
                      multiselect={true}
                      control={control}
                      name={`users.${index}.authority`}
                      rules={{ required: true }}
                      defaultValue="superuser"
                      options={[
                        { key: 'superuser', content: 'superuser' },
                        { key: 'createdb', content: 'createdb' },
                        { key: 'inherit', content: 'inherit' },
                        { key: 'login', content: 'login' },
                        { key: 'nologin', content: 'nologin' },
                        { key: 'createrole', content: 'createrole' },
                        { key: 'replication', content: 'replication' },
                        { key: 'bypassrls', content: 'bypassrls' }
                      ]}
                    />
                  </div>
                  <div className="ml-3">
                    <Button
                      type="danger"
                      shape="round"
                      handleClick={() => {
                        remove(index);
                      }}
                      icon={'/images/pgsql/delete.svg'}
                    ></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className={clsx(styles.cardUsers, 'mt-4')}>
              <div className="flex">
                <div>
                  <span style={{ color: '#EC872A' }}>*</span> Databases
                </div>
                <div className="ml-auto">
                  <Button
                    size="mini"
                    type="lightBlue"
                    handleClick={() => {
                      dataBaseAppend({ name: '', user: '' });
                    }}
                    icon="/images/pgsql/add_blue.svg"
                  ></Button>
                </div>
              </div>
              {dataBaseArr.map((item, index) => (
                <div className="flex items-center mt-3" key={item.id}>
                  <ControlledTextField
                    control={control}
                    name={`dataBases.${index}.name`}
                    placeholder="databases name ( 3-32 )"
                    rules={{ required: { value: true, message: 'this is required' } }}
                  />

                  <div className="w-6"></div>
                  <div className="w-full">
                    <ControlledDropdown
                      control={control}
                      name={`dataBases.${index}.user`}
                      defaultValue="root"
                      rules={{ required: true }}
                      options={getValues('users').map((i) => {
                        return { key: i.name, content: i.name };
                      })}
                    />
                  </div>
                  <div className="ml-3">
                    <Button
                      type="danger"
                      shape="round"
                      handleClick={() => {
                        dataBaseRemove(index);
                      }}
                      icon={'/images/pgsql/delete.svg'}
                    ></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex mt-4 grow justify-between">
              {/* <div className={styles.cardCpu}>
                <div className="mb-3">Odd host</div>
                <ControlledTextField control={control} name="oddHost" placeholder="odd host" />
              </div> */}
              <div className={clsx(styles.cardCpu, 'w-1/2')}>
                <div className="mb-3">Cpu (m) </div>
                <ControlledNumberField control={control} name="limits.cpu" defaultValue={300} />
              </div>
              <div className="w-4"></div>
              <div className={clsx(styles.cardCpu, 'w-1/2')}>
                <div className="mb-3">Memory (Mi)</div>
                <ControlledNumberField control={control} name="limits.memory" defaultValue={300} />
              </div>
            </div>
            <div className={clsx(styles.cardVolume)}>
              <div className="flex p-6  items-center ">
                <span className="mr-2 w-44"> Volume size (Gi)</span>
                <ControlledNumberField control={control} name="volumeSize" defaultValue={1} />
              </div>
              {/* <div className={clsx(styles.cardIops)}>
                <div className="w-1/2">
                  <div className="mb-3">IOPS</div>
                  <ControlledNumberField control={control} name="iops" defaultValue={3000} />
                </div>
                <div className="w-4"></div>
                <div className="w-1/2">
                  <div className="mb-3">Througput</div>
                  <ControlledNumberField control={control} name="througput" defaultValue={125} />
                </div>
              </div> */}
            </div>
          </div>
        </div>

        <div className={clsx(styles.yaml, styles.card, 'flex-col p-6')}>
          <div className="flex items-center relative">
            <span className={styles.title}>YAML 定义</span>
            <div className="ml-auto">
              <Button
                handleClick={() => copyYaml()}
                type="lightBlue"
                shape="squareRound"
                icon="/images/pgsql/copy.svg"
              ></Button>
            </div>
          </div>
          <div className={clsx(styles.scrollWrap, 'grow flex')}>
            <div className={clsx(styles.yamlTemplate, 'absolute  w-full')}>
              <MarkDown text={yamlTemplate}></MarkDown>
            </div>
          </div>
        </div>
      </div>
      <div>
        <Dialog open={createPgsqlMutation.isLoading}>
          <DialogSurface className={styles.loading}>
            <Spinner size="small" label="创建中" />
          </DialogSurface>
        </Dialog>
      </div>
    </div>
  );
}

export default AddPage;
