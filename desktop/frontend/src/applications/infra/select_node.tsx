import { Input, Slider } from '@fluentui/react-components';
import { Dropdown, Option } from '@fluentui/react-components/unstable';
import { SelectNodes } from './infra_share';
import styles from './select_node.module.scss';

interface SelectNodeComponent {
  type: string;
  nodeType: string;
  setNodeType: (msg: string) => void;
  nodeCount: string;
  setNodeCountValue: (msg: string) => void;
  nodeDisk: number;
  setNodeDisk: (msg: number) => void;
}

const SelectNodeComponent = (props: SelectNodeComponent) => {
  const onSelectNode = (label: string | undefined) => {
    if (label) {
      let item = SelectNodes.find((item) => item.label === label);
      props.setNodeType(item?.key as string);
    }
  };

  return (
    <div>
      <div className={styles.head}>
        <div className={styles.dot}></div>
        <span className="pl-3">{props.type} 节点</span>
      </div>
      <div className="px-6 mt-5">
        <span className="w-24 inline-block">机器</span>
        <Dropdown
          className={styles.selectType}
          placeholder="请选择类型"
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
      <div className="px-6 mt-5 flex  items-center">
        <span className="w-24 inline-block">硬盘</span>
        <Slider
          min={0}
          max={256}
          className="w-72 mr-4"
          value={props.nodeDisk}
          onChange={(e, data) => props.setNodeDisk(data.value)}
        />
        <span> {props.nodeDisk}G </span>
      </div>
    </div>
  );
};

export default SelectNodeComponent;
