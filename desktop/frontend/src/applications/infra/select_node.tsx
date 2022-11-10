import { Input, Slider } from '@fluentui/react-components';
import { Dropdown, Option } from '@fluentui/react-components/unstable';
import clsx from 'clsx';
import { SelectDisks, SelectNodes } from './infra_share';
import styles from './select_node.module.scss';

interface SelectNodeComponent {
  type: string;
  nodeType: string;
  setNodeType: (msg: string) => void;
  nodeCount: string;
  setNodeCountValue: (msg: string) => void;
  nodeDisk: number;
  setNodeDisk: (msg: number) => void;
  DiskType: string;
  setDiskType: (msg: string) => void;
}

const SelectNodeComponent = (props: SelectNodeComponent) => {
  const onSelectNode = (label: string | undefined) => {
    if (label) {
      let item = SelectNodes.find((item) => item.label === label);
      props.setNodeType(item?.key as string);
    }
  };

  const onSelectDiskType = (label: string | undefined) => {
    if (label) {
      let item = SelectDisks.find((item) => item.label === label);
      props.setDiskType(item?.key as string);
    }
  };

  const onDefaultNodeType = (key: string): string[] => {
    let item = SelectNodes.find((item) => item.key === key);
    return [item?.label as string];
  };

  const onDefaultDiskType = (key: string): string[] => {
    let item = SelectDisks.find((item) => item.key === key);
    return [item?.label as string];
  };

  return (
    <div>
      <div className={styles.head}>
        <div className={styles.dot}></div>
        <span className={styles.info}>{props.type} 节点</span>
      </div>
      <div className="pl-8 mt-6">
        <span className={styles.cloudlabel}>机器</span>
        <Dropdown
          className={styles.selectType}
          placeholder="请选择类型"
          selectedOptions={onDefaultNodeType(props.nodeType)}
          onOptionSelect={(e, data) => onSelectNode(data.optionValue)}
        >
          {SelectNodes.map((item) => (
            <Option key={item.key}>{item.label}</Option>
          ))}
        </Dropdown>
        <Input
          className={styles.selectTypeCount}
          value={props.nodeCount}
          contentAfter={'台'}
          onChange={(e, data) => props.setNodeCountValue(data.value)}
        ></Input>
      </div>
      <div className="pl-8 mt-6 flex items-center">
        <span className={styles.cloudlabel}>硬盘</span>
        <Dropdown
          className={styles.selectType}
          placeholder="请选择类型"
          selectedOptions={onDefaultDiskType(props.DiskType)}
          onOptionSelect={(e, data) => onSelectDiskType(data.optionValue)}
        >
          {SelectDisks.map((item) => (
            <Option key={item.key}>{item.label}</Option>
          ))}
        </Dropdown>
        <Slider
          className={clsx(styles.selectTypeCount)}
          min={0}
          max={128}
          // className="w-72 mr-4"
          value={props.nodeDisk}
          onChange={(e, data) => props.setNodeDisk(data.value)}
        />
        <span> {props.nodeDisk}G </span>
      </div>
    </div>
  );
};

export default SelectNodeComponent;
