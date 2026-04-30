import React, { useState, useCallback } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const SearchBar = ({ racks, onLocateRack }) => {
  const [keyword, setKeyword] = useState('');

  const handleSearch = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setKeyword('');
      return;
    }

    const matched = racks?.find(
      r => r.name?.toLowerCase().includes(trimmed.toLowerCase()) ||
           r.rackId?.toLowerCase().includes(trimmed.toLowerCase())
    );

    if (matched) {
      onLocateRack(matched);
    }
    setKeyword(trimmed);
  }, [racks, onLocateRack]);

  return (
    <Input.Search
      size="small"
      placeholder="搜索机柜..."
      prefix={<SearchOutlined />}
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
      onSearch={handleSearch}
      style={{ width: 180 }}
      allowClear
    />
  );
};

export default SearchBar;
