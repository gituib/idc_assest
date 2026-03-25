import { useMemo } from 'react';

const extractNumberFromString = (str) => {
  if (!str) return 0;
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

const naturalSort = (a, b) => {
  const numA = extractNumberFromString(a);
  const numB = extractNumberFromString(b);
  if (numA !== numB) return numA - numB;
  return String(a).localeCompare(String(b), 'zh-CN');
};

const sortRooms = (rooms) => {
  return [...rooms].sort((a, b) => {
    const sortOrderA = a.sortOrder ?? a.sort_order ?? 0;
    const sortOrderB = b.sortOrder ?? b.sort_order ?? 0;
    if (sortOrderA !== sortOrderB) {
      return sortOrderA - sortOrderB;
    }
    return (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });
};

const sortRacksInRoom = (racks) => {
  return [...racks].sort((a, b) => {
    const sortOrderA = a.sortOrder ?? a.sort_order ?? 0;
    const sortOrderB = b.sortOrder ?? b.sort_order ?? 0;
    if (sortOrderA !== sortOrderB) {
      return sortOrderA - sortOrderB;
    }
    const numA = extractNumberFromString(a.name);
    const numB = extractNumberFromString(b.name);
    if (numA !== numB) return numA - numB;
    return (a.name || '').localeCompare(b.name || '', 'zh-CN');
  });
};

export const useSortedRacks = (racks) => {
  return useMemo(() => {
    if (!racks || !Array.isArray(racks) || racks.length === 0) {
      return [];
    }

    const roomMap = new Map();

    racks.forEach((rack) => {
      if (!rack || !rack.Room) return;

      const roomKey = rack.Room.roomId || rack.Room.id || rack.Room.name;
      if (!roomKey) return;

      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, {
          ...rack.Room,
          key: roomKey,
          roomId: roomKey,
          racks: [],
        });
      }
      roomMap.get(roomKey).racks.push(rack);
    });

    const sortedRooms = sortRooms(Array.from(roomMap.values()));

    sortedRooms.forEach((room) => {
      room.racks = sortRacksInRoom(room.racks);
      room.rackCount = room.racks.length;
      room.totalDevices = room.racks.reduce((sum, r) => sum + (r._count?.Devices || r.deviceCount || 0), 0);
    });

    return sortedRooms;
  }, [racks]);
};

export const filterRoomsBySearch = (rooms, searchText) => {
  if (!searchText || searchText.trim() === '') {
    return rooms;
  }

  const lowerSearch = searchText.toLowerCase().trim();

  return rooms
    .map((room) => {
      const roomNameMatch = room.name?.toLowerCase().includes(lowerSearch);
      const roomIdMatch = room.roomId?.toLowerCase().includes(lowerSearch);

      const filteredRacks = room.racks.filter((rack) => {
        const rackNameMatch = rack.name?.toLowerCase().includes(lowerSearch);
        const rackIdMatch = rack.rackId?.toLowerCase().includes(lowerSearch);
        return roomNameMatch || roomIdMatch || rackNameMatch || rackIdMatch;
      });

      if (roomNameMatch || roomIdMatch) {
        return { ...room, racks: room.racks };
      }

      if (filteredRacks.length > 0) {
        return { ...room, racks: filteredRacks };
      }

      return null;
    })
    .filter((room) => room !== null);
};

export const getRackStats = (rack, devices = []) => {
  const usedU = devices.reduce((sum, d) => sum + (d.height || d.u_height || 1), 0);
  const totalPower = devices.reduce((sum, d) => sum + (parseFloat(d.powerConsumption) || 0), 0);
  const totalHeight = rack.height || 45;
  const deviceCount = devices.length;
  const usagePercent = totalHeight > 0 ? Math.round((usedU / totalHeight) * 100) : 0;

  return {
    usedU,
    availableU: totalHeight - usedU,
    usagePercent,
    totalPower,
    totalHeight,
    deviceCount,
  };
};

export default useSortedRacks;