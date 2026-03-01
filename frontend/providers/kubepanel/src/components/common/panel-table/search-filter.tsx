import { SearchOutlined } from '@ant-design/icons';
import { Input, InputRef } from 'antd';
import { ColumnType } from 'antd/lib/table';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SearchFilterPanelProps {
  onSearched: (value: string) => void;
  visible: boolean;
}

function SearchFilterPanel({ onSearched, visible }: SearchFilterPanelProps) {
  const searchInput = useRef<InputRef>(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible) {
      setTimeout(() => searchInput.current?.focus(), 100);
    }
  }, [visible]);

  return (
    <div className="p-2 w-[200px]">
      <Input
        ref={searchInput}
        placeholder="Search by name"
        prefix={<SearchOutlined style={{ color: '#BFBFBF' }} />}
        allowClear
        onChange={(e) => {
          onSearched(e.target.value);
          setSearchText(e.target.value);
        }}
        value={searchText}
      />
    </div>
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
      <span className="inline-block bg-[#DBF3FF]">{middle}</span>
      {end}
    </>
  );
}

export function useSearchNameFilterProps<DataType>(
  getName: (value: any, data: DataType) => string
): ColumnType<DataType> & { searchText: string; filterFn: (record: DataType) => boolean } {
  const [searchText, setSearchText] = useState('');
  const [searched, setSearched] = useState(false);
  const [visible, setVisible] = useState(false);

  const filterFn = useCallback(
    (record: DataType) => {
      if (!searchText) return true;
      return getName(null, record)
        .toLocaleLowerCase()
        .includes(searchText.toLocaleLowerCase());
    },
    [searchText, getName]
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
          visible={visible}
        />
      );
    },
    onFilterDropdownOpenChange: (visible) => setVisible(visible),
    render: (value, data) => (
      <HighlightName name={getName(value, data)} highlight={searchText} enable={searched} />
    ),
    searchText,
    filterFn
  };
}
