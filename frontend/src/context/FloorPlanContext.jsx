import React, { createContext, useReducer, useCallback } from 'react';

const initialState = {
  selectedRoomId: null,
  selectedRack: null,
  hoveredRack: null,
  viewMode: 'standard',
  heatMapDimension: 'utilization',
  editMode: false,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  searchRackId: null,
  detailRack: null,
  detailVisible: false,
};

const actionTypes = {
  SET_SELECTED_ROOM: 'SET_SELECTED_ROOM',
  SET_SELECTED_RACK: 'SET_SELECTED_RACK',
  SET_HOVERED_RACK: 'SET_HOVERED_RACK',
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_EDIT_MODE: 'SET_EDIT_MODE',
  SET_VIEW_CHANGE: 'SET_VIEW_CHANGE',
  SET_SEARCH_RACK: 'SET_SEARCH_RACK',
  SHOW_DETAIL: 'SHOW_DETAIL',
  HIDE_DETAIL: 'HIDE_DETAIL',
  RESET: 'RESET',
};

function floorPlanReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_SELECTED_ROOM:
      return {
        ...state,
        selectedRoomId: action.payload,
        selectedRack: null,
        hoveredRack: null,
        searchRackId: null,
        detailRack: null,
        detailVisible: false,
      };
    case actionTypes.SET_SELECTED_RACK:
      return { ...state, selectedRack: action.payload };
    case actionTypes.SET_HOVERED_RACK:
      return { ...state, hoveredRack: action.payload };
    case actionTypes.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload.mode,
        heatMapDimension: action.payload.dimension || state.heatMapDimension,
      };
    case actionTypes.SET_EDIT_MODE:
      return { ...state, editMode: action.payload };
    case actionTypes.SET_VIEW_CHANGE:
      return {
        ...state,
        zoom: action.payload.zoom,
        offsetX: action.payload.offsetX,
        offsetY: action.payload.offsetY,
      };
    case actionTypes.SET_SEARCH_RACK:
      return { ...state, searchRackId: action.payload };
    case actionTypes.SHOW_DETAIL:
      return {
        ...state,
        detailRack: action.payload,
        detailVisible: true,
      };
    case actionTypes.HIDE_DETAIL:
      return {
        ...state,
        detailRack: null,
        detailVisible: false,
      };
    case actionTypes.RESET:
      return { ...initialState };
    default:
      return state;
  }
}

export const FloorPlanContext = createContext(null);

export const FloorPlanProvider = ({ children }) => {
  const [state, dispatch] = useReducer(floorPlanReducer, initialState);

  const setSelectedRoom = useCallback((roomId) => {
    dispatch({ type: actionTypes.SET_SELECTED_ROOM, payload: roomId });
  }, []);

  const setSelectedRack = useCallback((rack) => {
    dispatch({ type: actionTypes.SET_SELECTED_RACK, payload: rack });
  }, []);

  const setHoveredRack = useCallback((rack) => {
    dispatch({ type: actionTypes.SET_HOVERED_RACK, payload: rack });
  }, []);

  const setViewMode = useCallback((mode, dimension) => {
    dispatch({ type: actionTypes.SET_VIEW_MODE, payload: { mode, dimension } });
  }, []);

  const setEditMode = useCallback((enabled) => {
    dispatch({ type: actionTypes.SET_EDIT_MODE, payload: enabled });
  }, []);

  const setViewChange = useCallback((viewState) => {
    dispatch({ type: actionTypes.SET_VIEW_CHANGE, payload: viewState });
  }, []);

  const setSearchRack = useCallback((rackId) => {
    dispatch({ type: actionTypes.SET_SEARCH_RACK, payload: rackId });
  }, []);

  const showDetail = useCallback((rack) => {
    dispatch({ type: actionTypes.SHOW_DETAIL, payload: rack });
  }, []);

  const hideDetail = useCallback(() => {
    dispatch({ type: actionTypes.HIDE_DETAIL });
  }, []);

  const value = {
    ...state,
    setSelectedRoom,
    setSelectedRack,
    setHoveredRack,
    setViewMode,
    setEditMode,
    setViewChange,
    setSearchRack,
    showDetail,
    hideDetail,
  };

  return (
    <FloorPlanContext.Provider value={value}>
      {children}
    </FloorPlanContext.Provider>
  );
};

export default FloorPlanContext;
