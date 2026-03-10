import { useSWR, useFetch, useFetchList } from './useSWR';

export const useDevices = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/devices?${queryString}` : '/devices';

  return useFetchList(key);
};

export const useDevice = deviceId => {
  return useFetch(deviceId ? `/devices/${deviceId}` : null);
};

export const useRacks = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/racks?${queryString}` : '/racks';

  return useFetchList(key);
};

export const useRack = rackId => {
  return useFetch(rackId ? `/racks/${rackId}` : null);
};

export const useRooms = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/rooms?${queryString}` : '/rooms';

  return useFetchList(key);
};

export const useRoom = roomId => {
  return useFetch(roomId ? `/rooms/${roomId}` : null);
};

export const useUsers = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/users?${queryString}` : '/users';

  return useFetchList(key);
};

export const useUser = userId => {
  return useFetch(userId ? `/users/${userId}` : null);
};

export const useTickets = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/tickets?${queryString}` : '/tickets';

  return useFetchList(key);
};

export const useTicket = ticketId => {
  return useFetch(ticketId ? `/tickets/${ticketId}` : null);
};

export const useDeviceFields = () => {
  return useFetchList('/device-fields');
};

export const useConsumables = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/consumables?${queryString}` : '/consumables';

  return useFetchList(key);
};

export const useConsumableCategories = () => {
  return useFetchList('/consumable-categories');
};

export const useCables = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/cables?${queryString}` : '/cables';

  return useFetchList(key);
};

export const usePorts = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/device-ports?${queryString}` : '/device-ports';

  return useFetchList(key);
};

export const useInventoryPlans = (params = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== '')
  ).toString();
  const key = queryString ? `/inventory/plans?${queryString}` : '/inventory/plans';

  return useFetchList(key);
};

export const useSystemSettings = () => {
  return useFetch('/system-settings');
};

export const useDashboardStats = () => {
  return useFetch('/devices/stats');
};

export const useMutate = () => {
  const { mutate } = useSWR();
  return mutate;
};
