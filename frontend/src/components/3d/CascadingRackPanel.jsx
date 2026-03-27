import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input, Badge } from 'antd';
import { SearchOutlined, CloseOutlined, DatabaseOutlined } from '@ant-design/icons';

const CascadingRackPanel = ({
  rooms,
  selectedRoomKey,
  selectedRackId,
  onSelect,
  visible,
  onClose,
  triggerRef,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeRoomKey, setActiveRoomKey] = useState(null);
  const [hoveredRackId, setHoveredRackId] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (visible && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
    if (!visible) {
      setSearchText('');
      setFocusedIndex(-1);
      hasInitializedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      if (selectedRoomKey) {
        setActiveRoomKey(selectedRoomKey);
      } else if (rooms && rooms.length > 0) {
        setActiveRoomKey(rooms[0].key);
      }
    }
  }, [visible, selectedRoomKey, rooms]);

  const filteredRooms = useMemo(() => {
    if (!searchText.trim()) return rooms;

    const lowerSearch = searchText.toLowerCase().trim();

    return rooms
      .map(room => {
        const roomNameMatch = room.name?.toLowerCase().includes(lowerSearch);
        const roomIdMatch = room.roomId?.toLowerCase().includes(lowerSearch);

        if (roomNameMatch || roomIdMatch) {
          return room;
        }

        const filteredRacks = room.racks.filter(
          rack =>
            rack.name?.toLowerCase().includes(lowerSearch) ||
            rack.rackId?.toLowerCase().includes(lowerSearch)
        );

        if (filteredRacks.length > 0) {
          return { ...room, racks: filteredRacks };
        }

        return null;
      })
      .filter(room => room !== null);
  }, [rooms, searchText]);

  const flatRackList = useMemo(() => {
    const list = [];
    filteredRooms.forEach(room => {
      room.racks.forEach(rack => {
        list.push({ ...rack, roomKey: room.key, roomName: room.name });
      });
    });
    return list;
  }, [filteredRooms]);

  useEffect(() => {
    const handleKeyDown = e => {
      if (!visible) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, flatRackList.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatRackList.length) {
            const rack = flatRackList[focusedIndex];
            onSelect(rack);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, focusedIndex, flatRackList, onSelect, onClose]);

  const getUsageColor = percent => {
    if (percent >= 90) return '#ef4444';
    if (percent >= 70) return '#f59e0b';
    return '#22c55e';
  };

  const getUsageBadgeStatus = percent => {
    if (percent >= 90) return 'error';
    if (percent >= 70) return 'warning';
    return 'success';
  };

  const handleRackSelect = useCallback(
    (rack, room) => {
      onSelect(rack, room);
    },
    [onSelect]
  );

  const handlePanelClick = useCallback(e => {
    e.stopPropagation();
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      onClick={handlePanelClick}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 8,
        width: 520,
        maxHeight: 480,
        background: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        zIndex: 1000,
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .rack-panel-item:hover {
          background: rgba(59, 130, 246, 0.15) !important;
        }
        .rack-panel-item.focused {
          background: rgba(59, 130, 246, 0.25) !important;
        }
        .rack-panel-item.selected {
          background: rgba(59, 130, 246, 0.2) !important;
          border-left: 3px solid #3b82f6;
        }
      `}</style>

      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Input
          ref={searchInputRef}
          value={searchText}
          onChange={e => {
            setSearchText(e.target.value);
            setFocusedIndex(-1);
          }}
          placeholder="搜索机房或机柜..."
          prefix={<SearchOutlined style={{ color: 'rgba(255, 255, 255, 0.4)' }} />}
          suffix={
            searchText && (
              <CloseOutlined
                style={{ color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer' }}
                onClick={() => setSearchText('')}
              />
            )
          }
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            color: 'white',
            height: 40,
          }}
        />
      </div>

      <div
        style={{
          maxHeight: 380,
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        {filteredRooms.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            未找到匹配的机房或机柜
          </div>
        ) : (
          filteredRooms.map((room, roomIndex) => (
            <div key={room.key} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background:
                    activeRoomKey === room.key ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                }}
                onClick={() => setActiveRoomKey(activeRoomKey === room.key ? null : room.key)}
              >
                <DatabaseOutlined style={{ color: '#60a5fa', fontSize: 14 }} />
                <span
                  style={{
                    color: '#f8fafc',
                    fontWeight: 600,
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {room.name}
                </span>
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: 11,
                  }}
                >
                  {room.racks.length} 机柜
                </span>
                <span
                  style={{
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontSize: 10,
                    transition: 'transform 0.2s',
                    transform: activeRoomKey === room.key ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▼
                </span>
              </div>

              {activeRoomKey === room.key && (
                <div style={{ paddingLeft: 16 }}>
                  {room.racks.map((rack, rackIndex) => {
                    const globalIndex = flatRackList.findIndex(r => r.rackId === rack.rackId);
                    const deviceCount = rack.Devices?.length || rack.deviceCount || 0;
                    const height = rack.height || 45;
                    const usedU = deviceCount * 2;
                    const usagePercent = Math.min(100, Math.round((usedU / height) * 100));

                    const isSelected = rack.rackId === selectedRackId;
                    const isFocused = globalIndex === focusedIndex;
                    const isHovered = rack.rackId === hoveredRackId;

                    return (
                      <div
                        key={rack.rackId}
                        className={`rack-panel-item ${
                          isSelected ? 'selected' : isFocused ? 'focused' : ''
                        }`}
                        style={{
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          borderRadius: 8,
                          margin: '2px 8px',
                          transition: 'all 0.15s ease',
                          borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                          background: isHovered ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        }}
                        onClick={() => handleRackSelect(rack, room)}
                        onMouseEnter={() => setHoveredRackId(rack.rackId)}
                        onMouseLeave={() => setHoveredRackId(null)}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: getUsageColor(usagePercent),
                            boxShadow: `0 0 6px ${getUsageColor(usagePercent)}`,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              color: '#f8fafc',
                              fontSize: 13,
                              fontWeight: 500,
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rack.name}
                          </div>
                          <div
                            style={{
                              color: 'rgba(255, 255, 255, 0.4)',
                              fontSize: 11,
                              display: 'flex',
                              gap: 12,
                            }}
                          >
                            <span>{height}U</span>
                            <span>{deviceCount} 设备</span>
                          </div>
                        </div>
                        <Badge
                          status={getUsageBadgeStatus(usagePercent)}
                          text={
                            <span
                              style={{
                                color:
                                  usagePercent >= 70
                                    ? usagePercent >= 90
                                      ? '#ef4444'
                                      : '#f59e0b'
                                    : '#22c55e',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {usagePercent}%
                            </span>
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}>
          使用 ↑↓ 键导航，Enter 确认，Esc 关闭
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 11 }}>
          {flatRackList.length} 个机柜
        </span>
      </div>
    </div>
  );
};

export default CascadingRackPanel;
