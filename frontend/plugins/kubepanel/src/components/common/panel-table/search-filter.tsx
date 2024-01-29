import { SearchOutlined } from '@ant-design/icons';
import { Button, Flex, Input, InputRef } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SearchFilterPanelProps {
  onSearched: (value: string) => void;
  onReset: () => void;
  visible: boolean;
}

function SearchFilterPanel({ onSearched, onReset, visible }: SearchFilterPanelProps) {
  const searchInput = useRef<InputRef>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    console.log('visible', visible);
    if (visible) {
      setTimeout(() => searchInput.current?.focus(), 100);
    }
  }, [visible]);

  return (
    <Flex vertical gap="12px" align="center" className="p-4">
      <Input
        ref={searchInput}
        placeholder="Search by name"
        onChange={(e) => {
          onSearched(e.target.value);
          setSearchText(e.target.value);
        }}
        value={searchText}
      />
      <Button
        type="primary"
        onClick={() => {
          onReset();
          setSearchText('');
        }}
      >
        Reset
      </Button>
    </Flex>
  );
}

interface HighlightNameProps {
  name: string;
  highlight: string;
  enable?: boolean;
}

function HighlightName({ name, highlight, enable = true }: HighlightNameProps) {
  if (!enable) {
    return <>{name}</>;
  }

  const begin_idx = name.toLocaleLowerCase().indexOf(highlight.toLocaleLowerCase());
  if (begin_idx === -1) {
    return <>{name}</>;
  }

  const end_idx = begin_idx + highlight.length;
  const begin = name.slice(0, begin_idx);
  const middle = name.slice(begin_idx, end_idx);
  const end = name.slice(end_idx);

  return (
    <>
      {begin}
      <div className="inline-block bg-[#DBF3FF]">{middle}</div>
      {end}
    </>
  );
}

type onFilter<DataType> = Required<ColumnType<DataType>>['onFilter'];

export function useSearchNameFilterProps<DataType>(
  getName: (value: any, data: DataType) => string
): ColumnType<DataType> {
  const [searchText, setSearchText] = useState('');
  const [searched, setSearched] = useState(false);
  const [visible, setVisible] = useState(false);

  const onFilter = useCallback<onFilter<DataType>>(
    (value, record) =>
      getName(null, record)
        .toLocaleLowerCase()
        .includes((value as String).toLocaleLowerCase()),
    [getName]
  );

  return {
    filterDropdown({ setSelectedKeys, confirm }) {
      return (
        <SearchFilterPanel
          onSearched={(value) => {
            setSelectedKeys([value]);
            setSearchText(value);
            setSearched(true);
            confirm({ closeDropdown: false });
          }}
          onReset={() => {
            setSelectedKeys([]);
            setSearchText('');
            setSearched(false);
            confirm({ closeDropdown: false });
          }}
          visible={visible}
        />
      );
    },
    filterIcon(_) {
      return <SearchOutlined />;
    },
    onFilter,
    onFilterDropdownOpenChange: (visible) => setVisible(visible),
    render: (value, data) => (
      <HighlightName name={getName(value, data)} highlight={searchText} enable={searched} />
    )
  };
}
