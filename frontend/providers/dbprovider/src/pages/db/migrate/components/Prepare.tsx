import CodeBlock from '@/components/CodeBlock';
import { SupportMigrationDBType } from '@/types/db';
import { MigrateForm } from '@/types/migrate';
import { Box, Checkbox, Text } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

const PrepareBox = ({
  migrationType,
  formHook
}: {
  migrationType: SupportMigrationDBType;
  formHook: UseFormReturn<MigrateForm, any>;
}) => {
  if (!formHook || !migrationType) return <></>;
  // const [isChecked, setChecked] = useState(formHook.getValues('isChecked'));

  // const handleCheckboxChange = () => {
  //   setChecked(!isChecked);
  //   formHook.setValue('isChecked', !isChecked);
  // };

  const content = useMemo(() => {
    const contentConfig: Record<
      SupportMigrationDBType,
      {
        codeList: string[];
        permissionCheck: string;
        title: string;
        checkboxLabel: string;
      }
    > = {
      'apecloud-mysql': {
        codeList: [
          "# 设置 'binlog_format' 配置为 'row'. ",
          "show global variables like 'binlog%'; ",
          'set global binlog_format=ROW;  ',
          "# 设置 'binlog_row_image' 配置为'full'.",
          "show variables like '%row_im%';  ",
          "set binlog_row_image ='FULL';  "
        ],
        checkboxLabel: '我已阅读并完成迁移准备工作',
        permissionCheck: `source account: REPLICATION SLAVE、REPLICATION CLIENT、SELECT \n
        sink account: SELECT、INSERT、UPDATE、DELETE、CREATE、ALTER、DROP`,
        title: 'MySQL'
      },
      mongodb: {
        codeList: [
          `# 复制集群实例: 无需伸缩。需要提供用于迁移的主地址的地址`,
          `# Standalone实例: 需要将Standalone扩展到一个节点的副本集才能使用CDC`
        ],
        checkboxLabel: '我已阅读并完成迁移准备工作',
        permissionCheck: `source account: 待迁移仓库的读权限、admin、local \n
        sink account: 待迁移仓库的读写权限以及admin和local的读权限`,
        title: 'Monogo'
      },
      postgresql: {
        codeList: [
          "# 设置 'wal_level' 配置为 'logical'. ",
          `psql -c "ALTER SYSTEM SET wal_level = 'logical';"`
        ],
        checkboxLabel: '我已阅读并完成迁移准备工作',
        permissionCheck: `source account: 登录权限、源迁移对象的读权限、复制权限\n
        sink account: 登录权限、Sink的读/写权限`,
        title: 'PostgreSQL'
      }
    };

    return contentConfig[migrationType];
  }, [migrationType]);

  return (
    <Box>
      <Text fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        {content.title} 迁移配置
      </Text>
      <CodeBlock
        flexStyle={{
          mt: '14px'
        }}
        codeList={content.codeList}
      />
      <Text mt="20px" fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        {content.title} 迁移权限检查
      </Text>
      <Text mt="14px" fontSize={'12px'} fontWeight={400} color={'#24282C'}>
        {content.permissionCheck}
      </Text>
      <Text mt="20px" fontSize={'16px'} fontWeight={500} color={'#24282C'}>
        覆盖风险
      </Text>
      <Text mt="14px" fontSize={'12px'} fontWeight={400} color={'#24282C'}>
        如果 source 数据库中 source_database 和 sink 数据库中 sink_database 的数据库有重叠，应该在
        sink 数据库中新建 database，以免出现数据重叠
      </Text>

      <Checkbox
        isInvalid={!!formHook?.formState?.errors?.isChecked}
        mt="16px"
        {...formHook.register('isChecked', {
          required: true
        })}
      >
        <Text color={!!formHook?.formState?.errors?.isChecked ? '#E53E3E' : '#1D8CDC'}>
          {content.checkboxLabel}
        </Text>
      </Checkbox>
    </Box>
  );
};

export default PrepareBox;
